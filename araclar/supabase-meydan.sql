-- Köy Meydanı (forum, fotoğraflı yazı ve cevaplar), yorumlar (haber, etkinlik, fotoğraf), Market ilan istekleri, Esnaf Rehberi istekleri ve fotoğraf istekleri · Supabase veritabanı kurulumu
-- Supabase → SQL Editor'de bir kez çalıştırılır. Tekrar çalıştırmak zararsızdır (var olanı bozmaz).
--
-- Kurallar:
--  * Ziyaretçi yalnız yayındaki yazıları, cevapları ve yorumları okuyabilir.
--  * Ziyaretçi yazı/cevap/yorum gönderebilir; gönderilen her şey "bekliyor" olarak kaydedilir, siteye çıkmaz.
--  * Onaylama, silme, sabitleme yalnız yönetim panelinden yapılır: panel, yöneticinin GitHub giriş anahtarını
--    gönderir; veritabanı anahtarı GitHub'a sorar (sguven/cesnigir-der deposuna yazma izni var mı?).
--    Anahtarın kendisi saklanmaz; yalnız özeti (sha256) bir saatlik onay için tutulur.

create extension if not exists http with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.forum_konular (
  id bigint generated always as identity primary key,
  kategori text not null default 'Genel Sohbet'
    check (kategori in ('Genel Sohbet', 'Hatıralar', 'Gurbettekiler', 'Soru-Cevap')),
  baslik text not null check (char_length(btrim(baslik)) between 3 and 120),
  metin text not null check (char_length(btrim(metin)) between 2 and 4000),
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'yayinda')),
  sabit boolean not null default false,
  cevap_sayisi int not null default 0,
  son_hareket timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_cevaplar (
  id bigint generated always as identity primary key,
  konu_id bigint not null references public.forum_konular (id) on delete cascade,
  metin text not null check (char_length(btrim(metin)) between 1 and 2000),
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'yayinda')),
  created_at timestamptz not null default now()
);

-- Haberlere (duyurular), etkinliklere ve fotoğraflara yazılan yorumlar.
-- hedef: sitedeki kaydın kimliği (duyuru ve etkinlikte adresindeki kimlik, fotoğrafta dosya adı); hedef_baslik panelde gösterilir.
create table if not exists public.yorumlar (
  id bigint generated always as identity primary key,
  hedef_tur text not null check (hedef_tur in ('duyuru', 'etkinlik', 'foto')),
  hedef text not null check (char_length(hedef) between 1 and 200),
  hedef_baslik text check (char_length(hedef_baslik) <= 200),
  metin text not null check (char_length(btrim(metin)) between 1 and 2000),
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  durum text not null default 'bekliyor' check (durum in ('bekliyor', 'yayinda')),
  created_at timestamptz not null default now()
);
create index if not exists yorumlar_hedef on public.yorumlar (hedef_tur, hedef, created_at);

create index if not exists forum_konular_akis on public.forum_konular (durum, sabit desc, son_hareket desc);
create index if not exists forum_cevaplar_konu on public.forum_cevaplar (konu_id, created_at);

-- Fotoğraflar: yazıya ve cevaba en çok 4 fotoğraf eklenebilir. Dosyalar Supabase deposunda ("meydan" kovası) durur;
-- tabloda yalnız dosya yolu saklanır (2026-11/<kimlik>.jpg), başka adres yazılamaz.
alter table public.forum_konular add column if not exists fotolar text[] not null default '{}';
alter table public.forum_cevaplar add column if not exists fotolar text[] not null default '{}';
alter table public.forum_konular drop constraint if exists forum_konular_fotolar;
alter table public.forum_konular add constraint forum_konular_fotolar check (
  cardinality(fotolar) <= 4 and array_to_string(fotolar, ',') ~ '^([0-9]{4}-[0-9]{2}/[0-9a-f-]{36}[.]jpg(,|$))*$');
alter table public.forum_cevaplar drop constraint if exists forum_cevaplar_fotolar;
alter table public.forum_cevaplar add constraint forum_cevaplar_fotolar check (
  cardinality(fotolar) <= 4 and array_to_string(fotolar, ',') ~ '^([0-9]{4}-[0-9]{2}/[0-9a-f-]{36}[.]jpg(,|$))*$');

-- Depo: herkese açık okunur, yalnız JPEG, dosya başına en çok 3 MB (site fotoğrafı göndermeden önce küçültür).
-- Ziyaretçi yalnız yeni dosya ekleyebilir; var olanı değiştiremez, silemez, dosyaları listeleyemez.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('meydan', 'meydan', true, 3145728, array['image/jpeg'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "meydan fotograf yukleme" on storage.objects;
create policy "meydan fotograf yukleme" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'meydan' and name ~ '^[0-9]{4}-[0-9]{2}/[0-9a-f-]{36}[.]jpg$');

-- Market ilan istekleri: ziyaretçi kendi ilanını (fotoğraf ve telefonuyla) gönderir; istek burada yalnız onay bekler.
-- Yönetici onaylayınca panel ilanı sitenin dosyasına (data/pazar.json) yazar ve isteği buradan siler.
-- Ziyaretçi bu tabloyu okuyamaz (telefon numaraları yalnız yöneticiye görünür); yalnız yeni istek ekleyebilir.
create table if not exists public.pazar_istekleri (
  id bigint generated always as identity primary key,
  tur text not null default 'Satılık' check (tur in ('Satılık', 'Aranıyor', 'Yardım isteği')),
  baslik text not null check (char_length(btrim(baslik)) between 3 and 120),
  fiyat text check (char_length(fiyat) <= 30),
  aciklama text check (char_length(aciklama) <= 2000),
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  telefon text not null check (char_length(telefon) between 10 and 25 and telefon ~ '^[0-9+ ()-]+$'),
  fotolar text[] not null default '{}' check (
    cardinality(fotolar) <= 4 and array_to_string(fotolar, ',') ~ '^([0-9]{4}-[0-9]{2}/[0-9a-f-]{36}[.]jpg(,|$))*$'),
  created_at timestamptz not null default now()
);
alter table public.pazar_istekleri enable row level security;
revoke all on public.pazar_istekleri from anon, authenticated;
-- "select (id)" yalnız sitenin "bu tablo kurulu mu?" diye bakabilmesi içindir; okuma kuralı hiçbir satırı göstermez
grant select (id) on public.pazar_istekleri to anon, authenticated;
grant insert (tur, baslik, fiyat, aciklama, ad, telefon, fotolar) on public.pazar_istekleri to anon, authenticated;
drop policy if exists "istekler okunmaz" on public.pazar_istekleri;
create policy "istekler okunmaz" on public.pazar_istekleri for select to anon, authenticated using (false);
drop policy if exists "ilan onaya gonderilir" on public.pazar_istekleri;
create policy "ilan onaya gonderilir" on public.pazar_istekleri for insert to anon, authenticated with check (true);

-- Sel koruması: 10 dakikada 15'ten, toplamda 200'den fazla bekleyen ilan isteği olursa yenisi kabul edilmez
create or replace function public.pazar_sel_kontrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.pazar_istekleri where created_at > now() - interval '10 minutes') >= 15
   or (select count(*) from public.pazar_istekleri) >= 200 then
    raise exception 'Şu anda çok fazla ilan gönderildi. Lütfen biraz sonra tekrar deneyin.';
  end if;
  new.ad := btrim(new.ad);
  new.baslik := btrim(new.baslik);
  new.telefon := btrim(new.telefon);
  new.fiyat := nullif(btrim(new.fiyat), '');
  new.aciklama := nullif(btrim(new.aciklama), '');
  return new;
end $$;
drop trigger if exists pazar_istek_sel on public.pazar_istekleri;
create trigger pazar_istek_sel before insert on public.pazar_istekleri for each row execute function public.pazar_sel_kontrol();
revoke all on function public.pazar_sel_kontrol() from public, anon, authenticated;

-- Esnaf Rehberi istekleri: ziyaretçi kendi işletmesinin kartını (dükkân, restoran, sanayi, okul…) gönderir; düzen Market istekleriyle aynıdır.
-- Yönetici onaylayınca panel kaydı sitenin dosyasına (data/rehber.json) yazar ve isteği buradan siler.
create table if not exists public.rehber_istekleri (
  id bigint generated always as identity primary key,
  tur text not null default 'Diğer' check (tur in ('Otomotiv', 'Sanayi & İnşaat', 'Tarım & Hayvancılık', 'Gıda & Yeme-İçme', 'Hizmetler', 'Diğer',
    'Dükkân', 'Restoran', 'Sanayi', 'Okul', 'Hizmet')),
  baslik text not null check (char_length(btrim(baslik)) between 3 and 120),
  aciklama text check (char_length(aciklama) <= 2000),
  adres text check (char_length(adres) <= 200),
  link text check (char_length(link) <= 200 and link ~* '^https?://'),
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  telefon text not null check (char_length(telefon) between 10 and 25 and telefon ~ '^[0-9+ ()-]+$'),
  fotolar text[] not null default '{}' check (
    cardinality(fotolar) <= 4 and array_to_string(fotolar, ',') ~ '^([0-9]{4}-[0-9]{2}/[0-9a-f-]{36}[.]jpg(,|$))*$'),
  created_at timestamptz not null default now()
);
alter table public.rehber_istekleri enable row level security;
revoke all on public.rehber_istekleri from anon, authenticated;
grant select (id) on public.rehber_istekleri to anon, authenticated;
grant insert (tur, baslik, aciklama, adres, link, ad, telefon, fotolar) on public.rehber_istekleri to anon, authenticated;
drop policy if exists "istekler okunmaz" on public.rehber_istekleri;
create policy "istekler okunmaz" on public.rehber_istekleri for select to anon, authenticated using (false);
drop policy if exists "kayit onaya gonderilir" on public.rehber_istekleri;
create policy "kayit onaya gonderilir" on public.rehber_istekleri for insert to anon, authenticated with check (true);

create or replace function public.rehber_sel_kontrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.rehber_istekleri where created_at > now() - interval '10 minutes') >= 15
   or (select count(*) from public.rehber_istekleri) >= 200 then
    raise exception 'Şu anda çok fazla kayıt gönderildi. Lütfen biraz sonra tekrar deneyin.';
  end if;
  new.ad := btrim(new.ad);
  new.baslik := btrim(new.baslik);
  new.telefon := btrim(new.telefon);
  new.aciklama := nullif(btrim(new.aciklama), '');
  new.adres := nullif(btrim(new.adres), '');
  new.link := nullif(btrim(new.link), '');
  return new;
end $$;
drop trigger if exists rehber_istek_sel on public.rehber_istekleri;
create trigger rehber_istek_sel before insert on public.rehber_istekleri for each row execute function public.rehber_sel_kontrol();
revoke all on function public.rehber_sel_kontrol() from public, anon, authenticated;

-- Fotoğraf istekleri: ziyaretçi Fotoğraflar sayfasından fotoğraf gönderir (Köyümüzden ya da Derneğimizden bölümüne).
-- Yönetici onaylayınca panel fotoğrafları sitenin deposuna aktarır, data/galeri.json'a yazar ve isteği buradan siler.
create table if not exists public.foto_istekleri (
  id bigint generated always as identity primary key,
  kategori text not null default 'koy' check (kategori in ('koy', 'dernek')),
  aciklama text check (char_length(aciklama) <= 200),
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  fotolar text[] not null check (
    cardinality(fotolar) between 1 and 4 and array_to_string(fotolar, ',') ~ '^([0-9]{4}-[0-9]{2}/[0-9a-f-]{36}[.]jpg(,|$))*$'),
  created_at timestamptz not null default now()
);
alter table public.foto_istekleri enable row level security;
revoke all on public.foto_istekleri from anon, authenticated;
grant select (id) on public.foto_istekleri to anon, authenticated;
grant insert (kategori, aciklama, ad, fotolar) on public.foto_istekleri to anon, authenticated;
drop policy if exists "istekler okunmaz" on public.foto_istekleri;
create policy "istekler okunmaz" on public.foto_istekleri for select to anon, authenticated using (false);
drop policy if exists "foto onaya gonderilir" on public.foto_istekleri;
create policy "foto onaya gonderilir" on public.foto_istekleri for insert to anon, authenticated with check (true);

create or replace function public.foto_sel_kontrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.foto_istekleri where created_at > now() - interval '10 minutes') >= 15
   or (select count(*) from public.foto_istekleri) >= 200 then
    raise exception 'Şu anda çok fazla fotoğraf gönderildi. Lütfen biraz sonra tekrar deneyin.';
  end if;
  new.ad := btrim(new.ad);
  new.aciklama := nullif(btrim(new.aciklama), '');
  return new;
end $$;
drop trigger if exists foto_istek_sel on public.foto_istekleri;
create trigger foto_istek_sel before insert on public.foto_istekleri for each row execute function public.foto_sel_kontrol();
revoke all on function public.foto_sel_kontrol() from public, anon, authenticated;

alter table public.forum_konular enable row level security;
alter table public.forum_cevaplar enable row level security;
alter table public.yorumlar enable row level security;

-- Yetkiler: ziyaretçi okur ve yalnız izin verilen sütunları yazar (durum, sabit, tarih gibi alanlara dokunamaz)
revoke all on public.forum_konular, public.forum_cevaplar from anon, authenticated;
grant select on public.forum_konular, public.forum_cevaplar to anon, authenticated;
grant insert (kategori, baslik, metin, ad, fotolar) on public.forum_konular to anon, authenticated;
grant insert (konu_id, metin, ad, fotolar) on public.forum_cevaplar to anon, authenticated;
revoke all on public.yorumlar from anon, authenticated;
grant select on public.yorumlar to anon, authenticated;
grant insert (hedef_tur, hedef, hedef_baslik, metin, ad) on public.yorumlar to anon, authenticated;

drop policy if exists "yayindakiler okunur" on public.forum_konular;
create policy "yayindakiler okunur" on public.forum_konular for select to anon, authenticated using (durum = 'yayinda');
drop policy if exists "yazi onaya gonderilir" on public.forum_konular;
create policy "yazi onaya gonderilir" on public.forum_konular for insert to anon, authenticated
  with check (durum = 'bekliyor' and sabit = false and cevap_sayisi = 0);

drop policy if exists "yayindakiler okunur" on public.forum_cevaplar;
create policy "yayindakiler okunur" on public.forum_cevaplar for select to anon, authenticated using (durum = 'yayinda');
drop policy if exists "cevap onaya gonderilir" on public.forum_cevaplar;
create policy "cevap onaya gonderilir" on public.forum_cevaplar for insert to anon, authenticated
  with check (durum = 'bekliyor'
    and exists (select 1 from public.forum_konular k where k.id = konu_id and k.durum = 'yayinda'));

drop policy if exists "yayindakiler okunur" on public.yorumlar;
create policy "yayindakiler okunur" on public.yorumlar for select to anon, authenticated using (durum = 'yayinda');
drop policy if exists "yorum onaya gonderilir" on public.yorumlar;
create policy "yorum onaya gonderilir" on public.yorumlar for insert to anon, authenticated with check (durum = 'bekliyor');

-- Sel koruması: 10 dakikada onay bekleyen 40'tan fazla gönderi olursa yeni gönderi kabul edilmez
create or replace function public.forum_sel_kontrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.forum_konular where durum = 'bekliyor' and created_at > now() - interval '10 minutes')
   + (select count(*) from public.forum_cevaplar where durum = 'bekliyor' and created_at > now() - interval '10 minutes')
   + (select count(*) from public.yorumlar where durum = 'bekliyor' and created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Şu anda çok fazla yazı gönderildi. Lütfen biraz sonra tekrar deneyin.';
  end if;
  new.ad := btrim(new.ad);
  new.metin := btrim(new.metin);
  return new;
end $$;
drop trigger if exists forum_konu_sel on public.forum_konular;
create trigger forum_konu_sel before insert on public.forum_konular for each row execute function public.forum_sel_kontrol();
drop trigger if exists forum_cevap_sel on public.forum_cevaplar;
create trigger forum_cevap_sel before insert on public.forum_cevaplar for each row execute function public.forum_sel_kontrol();
drop trigger if exists yorum_sel on public.yorumlar;
create trigger yorum_sel before insert on public.yorumlar for each row execute function public.forum_sel_kontrol();

-- Yazının cevap sayısı (yalnız yayındaki cevaplar)
create or replace function public.forum_cevap_say() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k bigint := coalesce(new.konu_id, old.konu_id);
begin
  update public.forum_konular f set
    cevap_sayisi = (select count(*) from public.forum_cevaplar c where c.konu_id = k and c.durum = 'yayinda')
  where f.id = k;
  return null;
end $$;
drop trigger if exists forum_cevap_say on public.forum_cevaplar;
create trigger forum_cevap_say after insert or update or delete on public.forum_cevaplar for each row execute function public.forum_cevap_say();

-- Yönetici kontrolü
create schema if not exists ozel;
revoke all on schema ozel from public, anon, authenticated;
create table if not exists ozel.yetkili (anahtar_ozet text primary key, gecerli timestamptz not null);

create or replace function public.forum_yetki(anahtar text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  h text;
  r extensions.http_response;
  ok boolean := false;
begin
  if anahtar is null or char_length(anahtar) < 20 then return false; end if;
  h := encode(extensions.digest(anahtar, 'sha256'), 'hex');
  if exists (select 1 from ozel.yetkili where anahtar_ozet = h and gecerli > now()) then return true; end if;
  begin
    r := extensions.http((
      'GET', 'https://api.github.com/repos/sguven/cesnigir-der',
      array[extensions.http_header('Authorization', 'Bearer ' || anahtar),
            extensions.http_header('User-Agent', 'cesnigir-der-forum'),
            extensions.http_header('Accept', 'application/vnd.github+json')],
      null, null)::extensions.http_request);
    ok := r.status = 200 and coalesce((r.content::jsonb -> 'permissions' ->> 'push')::boolean, false);
  exception when others then
    ok := false;
  end;
  if ok then
    insert into ozel.yetkili values (h, now() + interval '1 hour')
      on conflict (anahtar_ozet) do update set gecerli = excluded.gecerli;
    delete from ozel.yetkili where gecerli < now();
  end if;
  return ok;
end $$;
revoke all on function public.forum_yetki(text) from public, anon, authenticated;

-- Panel: onay bekleyenler (yazılar, cevaplar, yorumlar, Market, Esnaf Rehberi ve fotoğraf istekleri)
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
    'fotolar', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.foto_istekleri f), '[]'::jsonb));
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
  else
    raise exception 'bilinmeyen tür';
  end if;
end $$;

revoke all on function public.forum_bekleyenler(text), public.forum_islem(text, text, bigint, text) from public;
grant execute on function public.forum_bekleyenler(text), public.forum_islem(text, text, bigint, text) to anon, authenticated;
revoke all on function public.forum_sel_kontrol(), public.forum_cevap_say() from public, anon, authenticated;

notify pgrst, 'reload schema';
