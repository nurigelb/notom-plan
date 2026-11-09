# CLAUDE.md — NoTom Mobil PWA & Backend Otonom Canlıya Alma Görevi

Bu klasörde (`c:\Users\nuri\Desktop\projeler\NoTom`) açıldığında ana görevin, [CLAUDE_CANLIYA_ALMA_REHBERI.md](./CLAUDE_CANLIYA_ALMA_REHBERI.md) dosyasındaki **Aşama 1'den Aşama 5'e kadar olan tüm adımları sırasıyla ve otonom olarak çalıştırıp** uygulamayı canlı `https://...` adresine yayınlamak ve sonunda terminalde telefon kamerasıyla okutulacak bir **QR Kod** üretmektir.

## Hızlı Komut Özeti
1. **Ön Kontrol:** `node --check server.js` ve `node --check app.js`
2. **Çoklu Bulut Hazırlığı:** [CLAUDE_CANLIYA_ALMA_REHBERI.md](./CLAUDE_CANLIYA_ALMA_REHBERI.md) **Aşama 2**'deki `vercel.json`, `api/index.js` ve `netlify.toml` dosyalarını oluşturup `server.js` içindeki `STORAGE_DIR` yolunu serverless uyumlu hale getir.
3. **Canlıya Alma (Deploy):**
   - Önce `npx --yes vercel deploy --prod --yes` (veya `@railway/cli` / `netlify-cli`) dene.
   - Kullanıcı hiçbir bulut hesabına giriş yapmak istemezse **Yöntem 3D**'deki `ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run` komutuyla anında ücretsiz HTTPS tünelini aç.
4. **Canlı Doğrulama & QR Kod:** Canlı HTTPS linkini test et (`/api/health`, `/manifest.json`, `/sw.js`) ve `npx --yes qrcode-terminal "<CANLI_HTTPS_URL>"` ile ekrana QR kodu bas.

Detaylı adım adım komutlar için hemen **[CLAUDE_CANLIYA_ALMA_REHBERI.md](./CLAUDE_CANLIYA_ALMA_REHBERI.md)** dosyasını oku ve **Aşama 1**'den başla.

