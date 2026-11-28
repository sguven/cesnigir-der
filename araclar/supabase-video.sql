-- Ziyaretçilerin video göndermesi · Supabase kurulumu (bir kez çalıştırın)
-- https://supabase.com/dashboard/project/hdztvyindbhhpveukvox/sql/new adresine yapıştırıp Run deyin.
-- Aynısı araclar/supabase-meydan.sql içinde de var; bu dosya yalnız yeni parçaları içerir.

-- Video istekleri: ziyaretçi Fotoğraf & Video sayfasının Videolar sekmesinden bir videonun bağlantısını gönderir (YouTube, Instagram, Facebook, TikTok).
-- Video dosyası alınmaz, yalnız bağlantı. Yönetici onaylayınca panel videoyu sitenin dosyasına (data/videolar.json) yazar ve isteği buradan siler.
create table if not exists public.video_istekleri (
  id bigint generated always as identity primary key,
  link text not null check (char_length(link) between 12 and 300 and link ~* '^https://([a-z0-9-]+[.])*(youtube[.]com|youtu[.]be|instagram[.]com|facebook[.]com|fb[.]watch|tiktok[.]com)/'),
  baslik text not null check (char_length(btrim(baslik)) between 3 and 120),
  aciklama text check (char_length(aciklama) <= 500),
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  created_at timestamptz not null default now()
);
alter table public.video_istekleri enable row level security;
revoke all on public.video_istekleri from anon, authenticated;
grant select (id) on public.video_istekleri to anon, authenticated;
grant insert (link, baslik, aciklama, ad) on public.video_istekleri to anon, authenticated;
drop policy if exists "istekler okunmaz" on public.video_istekleri;
create policy "istekler okunmaz" on public.video_istekleri for select to anon, authenticated using (false);
drop policy if exists "video onaya gonderilir" on public.video_istekleri;
create policy "video onaya gonderilir" on public.video_istekleri for insert to anon, authenticated with check (true);

create or replace function public.video_sel_kontrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.video_istekleri where created_at > now() - interval '10 minutes') >= 15
   or (select count(*) from public.video_istekleri) >= 200 then
    raise exception 'Şu anda çok fazla video gönderildi. Lütfen biraz sonra tekrar deneyin.';
  end if;
  new.link := btrim(new.link);
  new.ad := btrim(new.ad);
  new.baslik := btrim(new.baslik);
  new.aciklama := nullif(btrim(new.aciklama), '');
  return new;
end $$;
drop trigger if exists video_istek_sel on public.video_istekleri;
create trigger video_istek_sel before insert on public.video_istekleri for each row execute function public.video_sel_kontrol();
revoke all on function public.video_sel_kontrol() from public, anon, authenticated;

-- Panel: onay bekleyenler (yazılar, cevaplar, yorumlar, Market, Esnaf Rehberi, fotoğraf, etkinlik ve video istekleri)
create or replace function public.forum_bekleyenler(anahtar text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.forum_yetki(anahtar) then raise exception 'yetki yok' using errcode = '42501'; end if;
  return jsonb_build_object(
    'konular', coalesce((select jsonb_agg(to_jsonb(k) order by k.created_at)
                           from public.forum_konular k where k.durum = 'bekliyor'), '[]'::jsonb),
    'cevaplar', coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('konu_baslik', k.baslik) order by c.created_at)
                           from public.forum_cevaplar c join public.forum_konular k on k.id = c.konu_id
                           where c.durum = 'bekliyor'), '[]'::jsonb),
    'yorumlar', coalesce((select jsonb_agg(to_jsonb(y) order by y.created_at)
                           from public.yorumlar y where y.durum = 'bekliyor'), '[]'::jsonb),
    'ilanlar', coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at) from public.pazar_istekleri i), '[]'::jsonb),
    'rehber', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.rehber_istekleri r), '[]'::jsonb),
    'fotolar', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.foto_istekleri f), '[]'::jsonb),
    'etkinlikler', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.etkinlik_istekleri e), '[]'::jsonb),
    'videolar', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at) from public.video_istekleri v), '[]'::jsonb));
end $$;

-- Panel: onayla / sil / sabitle
create or replace function public.forum_islem(anahtar text, tur text, kayit bigint, islem text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.forum_yetki(anahtar) then raise exception 'yetki yok' using errcode = '42501'; end if;
  if tur = 'konu' then
    if islem = 'onayla' then update public.forum_konular set durum = 'yayinda', son_hareket = now() where id = kayit;
    elsif islem = 'sil' then delete from public.forum_konular where id = kayit;
    elsif islem = 'sabitle' then update public.forum_konular set sabit = not sabit where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  elsif tur = 'cevap' then
    if islem = 'onayla' then
      update public.forum_cevaplar set durum = 'yayinda' where id = kayit;
      -- yeni cevap gelen yazı akışta yukarı çıkar
      update public.forum_konular set son_hareket = now() where id = (select konu_id from public.forum_cevaplar where id = kayit);
    elsif islem = 'sil' then delete from public.forum_cevaplar where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  elsif tur = 'yorum' then
    if islem = 'onayla' then update public.yorumlar set durum = 'yayinda' where id = kayit;
    elsif islem = 'sil' then delete from public.yorumlar where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  elsif tur = 'ilan' then
    -- ilan isteği: yayınlanınca (panel ilanı sitenin dosyasına yazdıktan sonra) ya da reddedilince silinir
    if islem = 'sil' then delete from public.pazar_istekleri where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  elsif tur = 'rehber' then
    if islem = 'sil' then delete from public.rehber_istekleri where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  elsif tur = 'foto' then
    if islem = 'sil' then delete from public.foto_istekleri where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  elsif tur = 'etkinlik' then
    if islem = 'sil' then delete from public.etkinlik_istekleri where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  elsif tur = 'video' then
    if islem = 'sil' then delete from public.video_istekleri where id = kayit;
    else raise exception 'bilinmeyen işlem'; end if;
  else
    raise exception 'bilinmeyen tür';
  end if;
end $$;

revoke all on function public.forum_bekleyenler(text), public.forum_islem(text, text, bigint, text) from public;
grant execute on function public.forum_bekleyenler(text), public.forum_islem(text, text, bigint, text) to anon, authenticated;

notify pgrst, 'reload schema';
