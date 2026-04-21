# 🎬 MovieBot: LK21 Unofficial API

API tidak resmi untuk mengakses data film dan serial dari situs LK21 (LayarKaca21). Dibangun menggunakan Node.js, Express, dan Cheerio.

## 🚀 Fitur
- 🔍 Pencarian film atau serial berdasarkan judul.
- 🆕 Mengambil daftar film atau serial terbaru.
- 🎭 Filter berdasarkan genre, negara, atau tahun rilis.
- 📄 Mengambil detail lengkap, termasuk sinopsis dan info lainnya.
- 📺 Mengambil link streaming (embed).

## 🧰 Teknologi
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Axios](https://axios-http.com/)
- [Cheerio](https://cheerio.js.org/)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [Morgan](https://www.npmjs.com/package/morgan)
- [CORS](https://www.npmjs.com/package/cors)

## 📦 Instalasi

1. **Siapkan lingkungan:**
   ```bash
   cd "/home/mr-koala/Documents/SOURCE CODE/moviebot"
   npm install
   ```

2. **Konfigurasi .env:**
   Pastikan file `.env` sudah sesuai:
   ```env
   PORT=3000
   LK21_BASE_MOVIE=https://tv1.nontondrama.click/
   LK21_BASE_SERIES=https://tv17.nontondrama.click/
   ```

3. **Jalankan server:**
   ```bash
   npm start
   ```
   (Atau `node index.js`)

## 📚 Dokumentasi API

### 🔍 Pencarian
- `GET /search?s=judul` - Cari film atau serial berdasarkan judul.

### 🎬 Film
- `GET /movies/latest?page=1` - Daftar film terbaru.
- `GET /movies/genres` - Daftar genre film.
- `GET /movies/genre/:genre?page=1` - Filter film berdasarkan genre.
- `GET /movies/country/:country?page=1` - Filter film berdasarkan negara.
- `GET /movies/year/:year?page=1` - Filter film berdasarkan tahun.
- `GET /movies/:slug` - Detail film (sinopsis, info).
- `GET /movies/:slug/stream` - Link streaming film.

### 📺 Serial
- `GET /series/latest?page=1` - Daftar serial terbaru.
- `GET /series/genres` - Daftar genre serial.
- `GET /series/genre/:genre?page=1` - Filter serial berdasarkan genre.
- `GET /series/:slug` - Detail serial / daftar episode.
- `GET /series/:slug/stream` - Link streaming serial.

## ⚠️ Catatan Penting
Proyek ini dibuat untuk tujuan pembelajaran. Data yang diambil sepenuhnya milik pemilik situs sumber. Gunakan dengan bijak.
