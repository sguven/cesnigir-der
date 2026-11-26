-- Esnaf Rehberi türleri yenilendi (Kasım 2026). Supabase > SQL Editor'de bir kez çalıştırın.
-- Ziyaretçi formu yeni türlerle (Oto Tamir & Parça, Elektrik & Tesisat…) kayıt gönderebilsin diye tablodaki tür kuralını günceller.
-- Eski türler de kabul edilmeye devam eder; site onları kendisi yeni türe çevirir. Tekrar çalıştırmak zararsızdır.
alter table public.rehber_istekleri drop constraint if exists rehber_istekleri_tur_check;
alter table public.rehber_istekleri alter column tur set default 'Diğer';
alter table public.rehber_istekleri add constraint rehber_istekleri_tur_check check (tur in (
  'Oto Tamir & Parça', 'Elektrik & Tesisat', 'İnşaat & Hırdavat', 'Sanayi & Makine', 'Yeme-İçme & Gıda',
  'Tarım & Hayvancılık', 'Kuaför & Güzellik', 'Sağlık', 'Eğitim', 'Nakliye', 'Hizmetler', 'Diğer',
  'Dükkân', 'Restoran', 'Sanayi', 'Okul', 'Hizmet'));
