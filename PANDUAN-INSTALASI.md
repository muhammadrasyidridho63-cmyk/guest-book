# Panduan Instalasi — SI-BUKU TAMU

## A. Backend (Google Apps Script)
1. Buka https://script.google.com → Proyek baru.
2. Ganti isi `Code.gs` dengan isi **Kode.gs** (rename berkas menjadi `Kode`). Di Setelan Proyek, aktifkan "Tampilkan appsscript.json" dan samakan isinya dengan **appsscript.json**.
3. Pilih fungsi `setupAppEnvironment` → Run → izinkan akses. **Jalankan sekali** (aman diulang, tidak menimpa data).
4. Buka Execution log: **catat kata sandi admin** (`admin / ...`, hanya tampil sekali). Spreadsheet database terbuat otomatis.
5. Deploy → New deployment → Web app → Execute as: **Me**, Who has access: **Anyone** → salin URL `/exec`.
6. Setiap ubah kode: Deploy → Manage deployments → ✏️ → **New version** (bukan New deployment).
7. Tambah petugas dari editor: jalankan `tambahPetugas('budi','Budi','satpam','sandi-minimal-12')`. Peran: `admin`, `pimpinan`, `satpam`, `ptsp`, `pp`.

Rahasia (`SESSION_SECRET`, ID spreadsheet) hanya di Script Properties. Jangan menambah editor proyek sembarangan.

## B. Frontend (GitHub Pages)
1. Ekstrak ZIP. **Folder hasil ekstraksi (yang berisi `index.html`) adalah folder yang di-`git init`.**
2. Edit `js/config.js`: ganti `GANTI_DENGAN_ID_DEPLOYMENT` dengan URL `/exec` Anda.
3. Buat repository **Public** di GitHub (tanpa README). Di terminal, di dalam folder tadi (pastikan `dir`/`ls` menampilkan `index.html`):
```
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
4. Settings → Pages → Deploy from branch → `main` / `(root)` → Save. Tunggu 1–2 menit.
5. Ctrl+Shift+R bila tampilan lama masih muncul.

## C. Pertama kali dipakai
Masuk Petugas dengan akun `admin` → **Pengaturan**: isi nama pengadilan, logo (URL gambar publik), loket, ruang sidang → **Tambah Agenda Sidang** (nomor perkara harus ada di agenda hari itu agar tamu sidang bisa mendaftar).

## D. Belum termasuk di versi ini
Notifikasi WA/CRM, mesin dokumen (PDF berkop + QR), migrasi dari data lama, login Google, ekspor PDF/XLSX server, manajemen petugas lewat dashboard. Ekspor saat ini berupa CSV yang dibuka di Excel.
