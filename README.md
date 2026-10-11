# 🌊 OceanAI - Platform AI Mahasiswa Teknik Kelautan

Platform AI interaktif terdedikasi untuk pembelajaran dan riset **Mahasiswa Teknik Kelautan (Ocean, Offshore & Marine Engineering)**. Dilengkapi konversi otomatis formula matematika **LaTeX**, integrasi autentikasi **Firebase (Email & Password)**, seleksi model dinamis dari endpoint **Mecutinai.com**, dan siap dideploy langsung ke **Vercel** atau **Netlify**.

---

## ✨ Fitur Unggulan

1. **Rendering Formula LaTeX Otomatis (KaTeX)**
   - Setiap persamaan matematika, variabel fisika, dan formula gelombang laut (`$$ ... $$`, `$ ... $`, `\[ ... \]`, `\( ... \)`) otomatis dikonversi menjadi tipografi matematis KaTeX yang rapi, bukan kode mentah.
   - Dilengkapi bilah sisip simbol cepat: $\omega$, $\lambda$, $\rho$, $\eta$, $\nabla$, $H_s$, $T_p$, $\tanh(kh)$, $\int$, $\sqrt{}$.

2. **Dukungan Model AI Dinamis (Endpoint Mecutinai.com)**
   - Mengambil daftar model aktif langsung dari endpoint `https://mecutinai.com/api/v1/models`.
   - Pilihan model mutakhir seperti:
     - `qwen3.8-max` (Rekomendasi Utama: Fisika, Gelombang & Formula)
     - `deepseek-v4-pro` (Penalaran Kompleks & Struktur Offshore)
     - `claude-sonnet-5` (Analisis Laporan & Regulasi Maritim)
     - `gpt-5.6-luna` & `gpt-5.6-sol` (Multiguna & Koding Simulasi)
     - `qwen3.8-flash` & `deepseek-v4.1-flash` (Respon Cepat)

3. **Autentikasi Firebase (Email & Password)**
   - Mendukung registrasi akun baru, login email/password, serta pemulihan kata sandi via Firebase Auth.
   - **Mode Demo Mahasiswa**: Aplikasi tetap dapat digunakan langsung tanpa konfigurasi Firebase.
   - **Setup Wizard In-App**: Pengaturan Firebase dapat dimasukkan via modal di aplikasi atau melalui variabel lingkungan (`.env.local`).

4. **Buku Rumus Inti Teknik Kelautan (Formula QuickSheet)**
   - Referensi instan untuk:
     - Persamaan Dispersi Airy: $\omega^2 = gk \tanh(kh)$
     - Gaya Morison pada Silinder Struktur: $dF = dF_D + dF_I$
     - Rumus Hudson Pemecah Gelombang (Breakwater): $W = \frac{\gamma_r H^3}{K_D (S_r - 1)^3 \cot\theta}$
     - Bilangan Froude ($Fn$) & Bilangan Formzahl Pasang Surut
     - Stabilitas Apung Kapal ($GM = KB + BM - KG$)
   - Tombol satu-klik untuk meminta AI menurunkan atau menghitung rumus tersebut.

5. **Streaming Real-Time & Collapsible Reasoning**
   - Respon mengalir kata-per-kata via Server-Sent Events (SSE).
   - Menampilkan accordion proses berpikir (*thinking process*) jika model menyediakannya.
   - Ekspor percakapan ke format Markdown (`.md`).

---

## 🚀 Panduan Menjalankan Secara Lokal

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Lingkungan (`.env.local`)
Buat atau periksa file `.env.local`:
```env
# Mecutinai API Configuration
MECUTINAI_BASE_URL=https://mecutinai.com/api/v1
MECUTINAI_API_KEY=sk_ip70YP5ZHmBf6CIamksvU62KVSaClmm8EZ4H49mTLSzGBWCP

# Firebase Authentication (Opsional / Masukkan dari Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 3. Jalankan Development Server
```bash
npm run dev
```
Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 🚢 Panduan Deploy ke Vercel atau Netlify

### Langkah 1: Unggah ke GitHub
```bash
git add .
git commit -m "feat: inisialisasi OceanAI platform kelautan"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/kelautan-jaya.git
git push -u origin main
```

### Langkah 2: Deploy ke Vercel (Rekomendasi)
1. Kunjungi [vercel.com](https://vercel.com) dan masuk dengan akun GitHub.
2. Klik **Add New... > Project** dan pilih repositori `kelautan-jaya`.
3. Pada bagian **Environment Variables**, tambahkan:
   - `MECUTINAI_API_KEY` = `sk_ip70YP5ZHmBf6CIamksvU62KVSaClmm8EZ4H49mTLSzGBWCP`
   - `NEXT_PUBLIC_FIREBASE_API_KEY` (jika menggunakan Firebase)
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (jika menggunakan Firebase)
4. Klik **Deploy**. Website Anda langsung aktif dengan SSL/HTTPS otomatis!

### Langkah 3: Alternatif Deploy ke Netlify
1. Kunjungi [netlify.com](https://netlify.com) dan pilih **Add new site > Import an existing project**.
2. Pilih repositori GitHub `kelautan-jaya`.
3. Masukkan Environment Variables yang sama, lalu klik **Deploy site**.

---

## 🛡️ Keamanan API Key
Kunci otorisasi Mecutinai (`sk_...`) disimpan di sisi server via Next.js Route Handlers (`/api/chat` dan `/api/models`), sehingga **tidak terekspos** di peramban pengguna atau *network inspector*.
