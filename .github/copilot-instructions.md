# PROJECT: TROCKER - PROFESSIONAL PRICE TRACKING SYSTEM

## 1. AMAÇ
Trocker; kullanıcıların e-ticaret sitelerindeki ürünleri takip etmelerini sağlayan, fiyat değişimlerini grafiklerle ve istatistiklerle sunan, profesyonel bir admin dashboard arayüzüne sahip web tabanlı bir takip otomasyonudur.

## 2. KULLANICI DENEYİMİ (UX) TASLAĞI
1.  **Giriş ve Karşılama:** Kullanıcı uygulamayı açtığında modern bir Admin Dashboard (Sidebar menülü) ile karşılaşır.
2.  **Dashboard (Genel Bakış):** Ana sayfada toplam takip edilen ürün sayısı, en son fiyatı düşen ürünler ve fiyat alarmı olan ürünlerin özet kartları görünür.
3.  **Ürün Ekleme:** "Takipler" sekmesine giden kullanıcı, ürün linkini yapıştırır. Sistem arka planda ürün adı, fiyatı ve görselini çeker (scrape) ve listeye ekler.
4.  **Takip ve İzleme:** Kullanıcı, tablo üzerinde ürünün güncel fiyatını, gördüğü en düşük fiyatı ve son kontrol zamanını anlık olarak görür.
5.  **Yönetim:** "Ayarlar" sekmesinden takip sıklığı ve profil bilgilerini günceller.

## 3. TEKNİK STACK (ZORUNLU SEÇİMLER)
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Lucide Icons
- **UI Components:** Shadcn UI (Sidebar, Table, Card, Dialog, Toast)
- **Database & Auth:** Supabase (PostgreSQL)
- **Data Fetching:** TanStack Query (React Query)
- **Scraper Logic:** Serverless Functions (Cheerio/Puppeteer-core)

## 4. VERİTABANI ŞEMASI (PRISMA/SUPABASE)
- **Users:** id, email, created_at
- **Products:** id, user_id, url, title, current_price, lowest_price, last_updated, image_url
- **PriceHistory:** id, product_id, price, timestamp

## 5. SAYFA YAPILARI VE ÖZELLİKLER

### A. Sidebar (Global Navigasyon)
- Logo: Trocker (Modern Bold Font)
- Menü: [Dashboard (Home Icon), Takipler (List Icon), Ayarlar (Settings Icon)]

### B. Dashboard (Ana Sayfa)
- **İstatistik Kartları:** Toplam Takip, Fiyatı Düşenler (Son 24s), Kritik İndirimler.
- **Grafik:** En çok takip edilen ürünlerin fiyat değişim trendini gösteren basit bir Area Chart (Recharts).

### C. Takipler Sayfası
- **Ürün Ekleme Formu:** Üst kısımda temiz bir Input ve "Takibe Al" butonu.
- **Ürün Tablosu (DataTable):**
    - Sütunlar: Ürün (Görsel + İsim), Güncel Fiyat, En Düşük Fiyat, Değişim (%), Son Güncelleme, Aksiyonlar (Sil/Git).
- **Empty State:** Henüz ürün eklenmemişse şık bir illüstrasyon ve yönlendirme.

## 6. UYGULAMA TALİMATLARI
1.  Next.js projesini TypeScript ile kur ve Shadcn UI bileşenlerini (table, card, button, input) ekle.
2.  Dashboard layout'unu sidebar yapısıyla oluştur. Responsive (mobil uyumlu) olmasına dikkat et.
3.  Ürün linkini işleyecek bir API Route (`/api/track`) oluştur. Bu route, linki alıp ürün bilgilerini parse etmeli (Mock data ile başlayıp sonra entegrasyonu sağla).
4.  State management için React Query kullanarak anlık veri güncellemelerini yönet.
5.  Karanlık/Aydınlık mod desteği ekle (Dark Mode default olsun).

Lütfen kodu yazmaya başla. Profesyonel, temiz ve modüler bir klasör yapısı kullan.