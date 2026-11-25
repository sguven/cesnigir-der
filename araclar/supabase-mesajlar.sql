-- Bize Ulaşın (dernek yönetimine mesaj) · Supabase veritabanı kurulumu
-- Supabase → SQL Editor'de bir kez çalıştırılır. Tekrar çalıştırmak zararsızdır (var olanı bozmaz).
-- Önce araclar/supabase-meydan.sql kurulmuş olmalı (yönetici kontrolü forum_yetki oradan gelir).

-- Bize Ulaşın: ziyaretçinin dernek yönetimine gönderdiği mesajlar. Sitede yayınlanmaz; yalnız yönetim panelinde görünür.
-- Ziyaretçi bu tabloyu okuyamaz (telefon ve e-postalar yalnız yöneticiye görünür); yalnız yeni mesaj ekleyebilir.
create table if not exists public.mesajlar (
  id bigint generated always as identity primary key,
  ad text not null check (char_length(btrim(ad)) between 3 and 60),
  iletisim text check (char_length(iletisim) <= 100),
  metin text not null check (char_length(btrim(metin)) between 5 and 3000),
  okundu boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.mesajlar enable row level security;
revoke all on public.mesajlar from anon, authenticated;
grant select (id) on public.mesajlar to anon, authenticated;
grant insert (ad, iletisim, metin) on public.mesajlar to anon, authenticated;
drop policy if exists "mesajlar okunmaz" on public.mesajlar;
create policy "mesajlar okunmaz" on public.mesajlar for select to anon, authenticated using (false);
drop policy if exists "mesaj gonderilir" on public.mesajlar;
create policy "mesaj gonderilir" on public.mesajlar for insert to anon, authenticated with check (okundu = false);

-- Sel koruması: 10 dakikada 10'dan, toplamda 300'den fazla okunmamış mesaj olursa yenisi kabul edilmez
create or replace function public.mesaj_sel_kontrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.mesajlar where created_at > now() - interval '10 minutes') >= 10
   or (select count(*) from public.mesajlar where okundu = false) >= 300 then
    raise exception 'Şu anda çok fazla mesaj gönderildi. Lütfen biraz sonra tekrar deneyin.';
  end if;
  new.ad := btrim(new.ad);
  new.metin := btrim(new.metin);
  new.iletisim := nullif(btrim(new.iletisim), '');
  new.okundu := false;
  return new;
end $$;
drop trigger if exists mesaj_sel on public.mesajlar;
create trigger mesaj_sel before insert on public.mesajlar for each row execute function public.mesaj_sel_kontrol();
revoke all on function public.mesaj_sel_kontrol() from public, anon, authenticated;

-- Panel: gelen mesajlar (en yeni üstte) ve okundu / okunmadı / sil
create or replace function public.mesaj_listesi(anahtar text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.forum_yetki(anahtar) then raise exception 'yetki yok' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc)
                     from (select * from public.mesajlar order by created_at desc limit 500) m), '[]'::jsonb);
end $$;
create or replace function public.mesaj_islem(anahtar text, kayit bigint, islem text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.forum_yetki(anahtar) then raise exception 'yetki yok' using errcode = '42501'; end if;
  if islem = 'okundu' then update public.mesajlar set okundu = true where id = kayit;
  elsif islem = 'okunmadi' then update public.mesajlar set okundu = false where id = kayit;
  elsif islem = 'sil' then delete from public.mesajlar where id = kayit;
  else raise exception 'bilinmeyen işlem'; end if;
end $$;
revoke all on function public.mesaj_listesi(text), public.mesaj_islem(text, bigint, text) from public;
grant execute on function public.mesaj_listesi(text), public.mesaj_islem(text, bigint, text) to anon, authenticated;

notify pgrst, 'reload schema';
