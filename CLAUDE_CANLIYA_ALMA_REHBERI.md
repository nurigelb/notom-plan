# 🤖 Claude İçin Otonom Canlıya Alma (Deployment) ve Mobil PWA Kurulum Talimatı

> **Claude İçin Sistem Komutu (Role & Görev):**
> Sen otonom çalışan bir yazılım ve DevOps ajanısın. Kullanıcı (`@nurigelb`), bu klasördeki (`c:\Users\nuri\Desktop\projeler\NoTom`) **Tenis · TSM Keman · AI Mühendisliği (NoTom Plan)** mobil PWA ve Backend uygulamasını **bilgisayarın açık olmasına gerek kalmadan telefonundan uygulama olarak kullanabilmek için** canlıya (production HTTPS URL) almanı istiyor.
>
> Aşağıdaki **5 Aşamayı sırasıyla, hiçbir adımı atlamadan ve mümkün olan her komutu terminalde bizzat çalıştırarak** uygula. Sadece kullanıcının tarayıcıda tek tıkla onay vermesi gereken (OAuth / Login) adımlarda kullanıcıdan onay iste, geri kalan tüm işlemleri kendin tamamla.

---

## 📂 Mevcut Proje Mimarisi Özeti

Uygulama halihazırda geliştirilmiş ve test edilmiştir. Klasördeki temel dosyalar:
- `server.js` — Sıfır bağımlılıklı Node.js HTTP & REST API sunucusu (`PORT = process.env.PORT || 3000`).
  - `GET /api/health` → Sunucu durum kontrolü (`{ ok: true, service: "notom-backend" }`).
  - `GET /api/state?profile=nuri` → Kullanıcının sunucuda kayıtlı ilerleme durumunu döner.
  - `POST /api/state?profile=nuri` → Kullanıcının ilerlemesini `storage/user_state.json` dosyasına atomik olarak kaydeder.
  - Diğer tüm `GET` isteklerinde statik PWA dosyalarını (`index.html`, `styles.css`, `data.js`, `app.js`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`) sunar.
- `app.js` — **Offline-First (Önce Çevrimdışı)** mimariyle çalışır:
  - Her değişikliği anında `localStorage` (`notom_plan_state_v2`) içine yazar **ve** arka planda `POST /api/state?profile=nuri` ile sunucuya senkronize eder.
  - Sunucuya ulaşılamadığında (veya statik barındırmada) uygulama hiçbir hata vermeden %100 çevrimdışı olarak telefonda çalışmaya devam eder.
- `manifest.json` & `sw.js` — iOS Safari ve Android Chrome'da adres çubuğu olmadan tam ekran (`display: standalone`) çalışmayı ve tüm dosyaları telefona önbelleklemeyi (`notom-pwa-cache-v3`) sağlar.
- `icon-192.png`, `icon-512.png`, `icon.svg` — Mobil ana ekran uygulama ikonları.
- `render.yaml` & `railway.json` — Bulut platformları için hazır yapılandırma dosyaları.

---

## 🚀 AŞAMA 1: Yerel Kontroller ve Ön Hazırlık (Pre-Flight Check)

Claude, işe başlamadan önce sırasıyla şu kontrolleri terminalde çalıştır:

### Adım 1.1: Dosya ve Sözdizimi (Syntax) Kontrolü
```powershell
node --check server.js
node --check data.js
node --check app.js
node --check sw.js
```
Eğer herhangi bir hata dönerse düzelt.

### Adım 1.2: İkonların ve Veritabanı Klasörünün Varlığını Doğrula
`icon-192.png`, `icon-512.png` ve `storage/user_state.json` dosyalarının mevcut olduğundan emin ol. Eksikse `server.js` içindeki `ensurePngIcons()` fonksiyonu sunucu ilk çalıştığında bunları otomatik üretir. Kontrol etmek için:
```powershell
Get-ChildItem icon-192.png, icon-512.png, manifest.json, sw.js, storage/user_state.json
```

### Adım 1.3: Backend API Testi
Sunucunun çalışıp çalışmadığını test et:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```
Eğer sunucu kapalıysa arka planda başlatıp `/api/health` ve `/api/state?profile=nuri` uç noktalarının `ok: true` döndüğünü doğrula:
```powershell
$body = @{ state = @{ activeModules = @{ tennis = 0; violin = 0; ai = 0 } }; updatedAt = (Get-Date).ToString("o") } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:3000/api/state?profile=nuri" -Method Post -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri "http://localhost:3000/api/state?profile=nuri" -Method Get
```

---

## 📦 AŞAMA 2: Çoklu Bulut Uyumluluğu (Vercel & Netlify Serverless Desteği Ekleme)

Kullanıcı uygulamayı ister **Railway / Render** (Node.js sunucusu olarak), ister **Vercel / Netlify** (Serverless olarak) üzerinde tek komutla yayınlayabilsin diye aşağıdaki yapılandırma dosyalarını oluştur:

### Adım 2.1: `vercel.json` Oluştur
Proje kök dizininde `vercel.json` dosyasını oluştur:
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

### Adım 2.2: `api/index.js` Oluştur (Vercel Serverless Köprüsü)
Vercel üzerinde `/api/health` ve `/api/state` isteklerinin `server.js` tarafından karşılanması için `api/index.js` dosyasını oluştur:
```javascript
const server = require("../server.js");

module.exports = (req, res) => {
  server.emit("request", req, res);
};
```
*(Not: `server.js` içinde `STORAGE_DIR` yazma izni salt-okunur serverless ortamlarda `/tmp` gerektirebileceğinden, `server.js` içindeki `STORAGE_DIR` tanımını şu şekilde güncelle:)*
```javascript
const STORAGE_DIR = process.env.VERCEL || process.env.NETLIFY
  ? path.join(os.tmpdir(), "notom-storage")
  : path.join(ROOT, "storage");
```

### Adım 2.3: `netlify.toml` Oluştur
Proje kök dizininde `netlify.toml` dosyasını oluştur:
```toml
[build]
  publish = "."

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json; charset=utf-8"
```

### Adım 2.4: Git Kaydını Güncelle
Eklenen tüm dosyaları Git'e kaydet:
```powershell
git add .
git commit -m "Add multi-cloud serverless and PWA deployment configs"
```

---

## ☁️ AŞAMA 3: Uygulamayı Canlıya Alma (7/24 Kalıcı HTTPS Linki Üretme)

Claude, şimdi uygulamayı internete açıp kullanıcıya **kalıcı bir `https://...` linki** üretmelisin. Aşağıdaki yöntemleri **sırasıyla** dene; hangisinde kimlik doğrulaması (login) mevcutsa veya kullanıcı hangisini onaylarsa onunla tamamla:

### Yöntem 3A (En Hızlı CLI Yöntemi): Vercel CLI (`npx vercel`)
1. Terminalde şu komutu çalıştırarak Vercel oturumu olup olmadığını kontrol et:
   ```powershell
   npx --yes vercel whoami
   ```
2. Eğer oturum açıksa doğrudan canlıya al:
   ```powershell
   npx --yes vercel deploy --prod --yes
   ```
3. Eğer oturum açık değilse `npx --yes vercel login` komutunu başlat ve kullanıcıya ekrandaki linke tıklayarak giriş yapmasını söyle. Giriş tamamlandığı anda `npx --yes vercel deploy --prod --yes` komutunu çalıştırıp üretilen `https://...vercel.app` linkini al.

### Yöntem 3B (Alternatif CLI Yöntemi): Railway CLI (Tam Kalıcı Node.js + Disk)
Kullanıcı tam Node.js sunucusu olarak Railway tercih ederse:
1. Oturum kontrolü:
   ```powershell
   npx --yes @railway/cli whoami
   ```
2. Oturum yoksa `npx --yes @railway/cli login` ile giriş yaptır, ardından:
   ```powershell
   npx --yes @railway/cli init --name notom-plan-app
   npx --yes @railway/cli up --detach
   npx --yes @railway/cli domain
   ```
   Üretilen `https://...up.railway.app` adresini kaydet.

### Yöntem 3C (Alternatif GitHub + Render.com Yöntemi)
Eğer kullanıcı GitHub üzerinden Render.com kullanmak isterse:
1. GitHub CLI (`gh`) kurulu mu kontrol et:
   ```powershell
   gh auth status
   ```
2. Kuruluysa repoyu otomatik oluştur ve gönder:
   ```powershell
   gh repo create notom-plan-app --public --source=. --remote=origin --push
   ```
3. `gh` kurulu değilse kullanıcıdan GitHub'da boş bir repo URL'si isteyip şu komutla gönder:
   ```powershell
   git remote add origin <REPO_URL>
   git push -u origin master
   ```
4. Ardından `https://dashboard.render.com/blueprint` adresinden reponun seçilmesiyle `render.yaml` dosyasının otomatik kurulacağını belirt.

### Yöntem 3D (Sıfır Üyelikli Anında HTTPS Test Tüneli — Hemen Şimdi Telefonda Kurmak İçin)
Kullanıcı hiçbir bulut hesabına giriş yapmadan **şu saniye** telefonuna HTTPS üzerinden uygulamayı kurmak isterse (PWA kurulumu sonrasında Service Worker tüm dosyaları telefona kaydettiği için tünel kapansa bile uygulama telefonda çevrimdışı çalışmaya devam eder!):
1.Yerel sunucunun `3000` portunda çalıştığından emin ol.
2. Windows OpenSSH ile ücretsiz HTTPS tüneli aç:
   ```powershell
   ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run
   ```
3. Çıktıdaki `https://xxxx.lhr.life` adresini kopyala ve kullanıcıya ver.

---

## 🔍 AŞAMA 4: Canlı (Production) Ortam Doğrulaması

Canlı `https://...` URL'sini aldıktan sonra Claude olarak şu 4 testi mutlaka çalıştır ve doğrula:

1. **Ana Sayfa Kontrolü:**
   ```powershell
   (Invoke-WebRequest -Uri "<CANLI_HTTPS_URL>" -UseBasicParsing).StatusCode
   ```
   *(200 dönmeli)*
2. **PWA Manifest ve İkon Kontrolü:**
   ```powershell
   Invoke-RestMethod -Uri "<CANLI_HTTPS_URL>/manifest.json"
   (Invoke-WebRequest -Uri "<CANLI_HTTPS_URL>/icon-192.png" -UseBasicParsing).StatusCode
   ```
   *(Manifest JSON dönmeli ve `icon-192.png` 200 dönmeli)*
3. **Service Worker Kontrolü:**
   ```powershell
   (Invoke-WebRequest -Uri "<CANLI_HTTPS_URL>/sw.js" -UseBasicParsing).StatusCode
   ```
   *(200 dönmeli)*
4. **Backend API Kontrolü:**
   ```powershell
   Invoke-RestMethod -Uri "<CANLI_HTTPS_URL>/api/health"
   ```
   *(`ok: true` dönmeli)*

---

## 📱 AŞAMA 5: Kullanıcıya Sunulacak Final Teslimatı (QR Kod + Telefon Kurulumu)

Canlı URL doğrulandıktan sonra terminalde veya ekranda kullanıcının telefon kamerasıyla okutabileceği bir **QR Kod** üret ve aşağıdaki özet kartını kullanıcıya göster:

### Adım 5.1: Terminalde QR Kod Göster (Kullanıcı Link Yazmakla Uğraşmasın)
```powershell
npx --yes qrcode-terminal "<CANLI_HTTPS_URL>"
```

### Adım 5.2: Kullanıcıya Gösterilecek Mesaj Şablonu
Kullanıcıya şu bilgileri net bir şekilde yaz:
1. **Canlı Uygulama Linkin:** `<CANLI_HTTPS_URL>`
2. **Telefona Uygulama Olarak Kurulum (Tek Seferlik - 10 Saniye):**
   - Telefonunun kamerasını açıp yukarıdaki **QR Kodu** okut (veya linke dokun).
   - **iPhone (Safari):** Alt ortadaki **Paylaş** (`↑`) butonuna bas → aşağı kaydırıp **"Ana Ekrana Ekle"** seçeneğine dokun → Sağ üstten **Ekle** de.
   - **Android (Chrome):** Ekranın altında çıkan **"NoTom Plan uygulamasını ana ekrana ekle"** bildirime dokun (veya sağ üstteki `⋮` menüsünden **"Uygulamayı yükle"** seçeneğine bas).
3. **Nasıl Çalışır?**
   - Artık telefonunun ana ekranında **NoTom Plan** ikonu var.
   - Bilgisayarın tamamen kapalıyken ve hatta internetin yokken bile (parkta tenis çalışırken veya evde keman çalışırken) uygulamaya girip **Bugün Ne Var?** ekranını, **Seans Zamanlayıcısını**, **60 BPM Keman Metronomunu**, **TSM Komalı Akortçuyu** ve **Pazar Yan Yana Video Karşılaştırıcısını** kullanabilirsin.

