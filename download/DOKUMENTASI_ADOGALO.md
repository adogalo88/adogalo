# 📋 Adogalo - Dokumentasi Penggunaan

## Tentang Aplikasi

**Adogalo** adalah sistem manajemen proyek konstruksi berbasis web yang menghubungkan tiga pihak: **Admin**, **Client**, dan **Vendor**. Aplikasi ini memungkinkan pengelolaan proyek, milestone, pembayaran, retensi, dan pekerjaan tambahan secara terintegrasi.

---

## 🚀 Fitur Utama

### 1. Autentikasi OTP
- Login aman menggunakan One-Time Password (OTP) yang dikirim ke email
- Mendukung 4 role: Admin, Manager, Client, Vendor
- Session management dengan JWT (7 hari)

### 2. Admin Dashboard
- Melihat semua proyek dengan statistik lengkap
- Membuat proyek baru dengan data client dan vendor
- Manajemen manager dengan penugasan proyek
- Detail proyek dengan data keuangan

### 3. Halaman Proyek (Client/Vendor)
- Statistik proyek real-time
- Progress bar pekerjaan dan pembayaran
- Daftar termin pembayaran
- Daftar milestone dengan log aktivitas
- Galeri gambar dengan lightbox
- Sistem komentar

### 4. Workflow Milestone
- **Vendor**: Mulai pekerjaan, Upload harian, Ajukan selesai, Perbaikan
- **Client**: Setujui & cairkan, Komplain
- **Admin**: Konfirmasi pembayaran

### 5. Fitur Keuangan
- **Retensi**: Vendor ajukan → Client setuju → Countdown → Release
- **Pekerjaan Tambahan**: Vendor ajukan → Client/Admin setuju
- **Pengurangan Nilai**: Vendor ajukan → Client setuju → Admin setuju

---

## 📖 Panduan Penggunaan

### A. Login Admin

1. Buka aplikasi dan klik **"Login sebagai Admin"**
2. Masukkan email admin: `aplikasipuyowongkito@gmail.com`
3. Klik **"Kirim OTP"**
4. Cek email untuk kode OTP 6 digit
5. Masukkan kode OTP di halaman verifikasi
6. Berhasil login → redirect ke Admin Dashboard

### B. Membuat Proyek Baru (Admin)

1. Di Admin Dashboard, klik **"Buat Proyek Baru"**
2. Isi form:
   - Judul proyek
   - Nama dan email Client
   - Nama dan email Vendor
3. Klik **"Buat Proyek"**
4. Proyek berhasil dibuat dengan ID unik
5. Share ID proyek ke Client dan Vendor untuk login

### C. Login Client/Vendor

1. Buka halaman utama
2. Masukkan **ID Proyek** dan **Email**
3. Klik **"Kirim OTP"**
4. Masukkan kode OTP dari email
5. Berhasil login → redirect ke halaman proyek

### D. Mengelola Milestone (Vendor)

1. Di halaman proyek, klik **"Tambah Milestone"**
2. Isi judul, nilai, dan deskripsi
3. Milestone dibuat dengan status "pending"
4. Termin pembayaran otomatis dibuat untuk Client

### E. Workflow Pekerjaan

**Memulai Pekerjaan (Vendor):**
1. Buka milestone yang statusnya "pending"
2. Klik **"Mulai Pekerjaan"**
3. Status berubah menjadi "active"

**Upload Progress Harian (Vendor):**
1. Di milestone active, klik **"Upload Harian"**
2. Isi catatan dan upload gambar
3. Log aktivitas tercatat

**Menyelesaikan Pekerjaan (Vendor):**
1. Klik **"Ajukan Selesai"**
2. Upload bukti akhir
3. Status berubah menjadi "waiting"

**Menyetujui Pekerjaan (Client):**
1. Lihat milestone dengan status "waiting"
2. Klik **"Setujui & Cairkan"**
3. Status berubah menjadi "waiting_admin"

**Konfirmasi Pembayaran (Admin):**
1. Di halaman detail proyek admin
2. Klik **"Konfirmasi Pembayaran"**
3. Fee dipotong, retensi ditahan, vendor dibayar

### F. Fitur Retensi

**Mengajukan Retensi (Vendor):**
1. Di section Retensi, klik **"Ajukan Retensi"**
2. Isi persentase dan durasi (hari)
3. Tunggu persetujuan Client

**Menyetujui Retensi (Client):**
1. Klik **"Setujui"** atau **"Tolak"**
2. Jika disetujui, retensi aktif

**Komplain Retensi (Client):**
1. Saat countdown berjalan, klik **"Ajukan Komplain"**
2. Isi catatan dan bukti
3. Timer pause, menunggu perbaikan vendor

**Me-release Retensi (Admin):**
1. Klik **"Cairkan Retensi"**
2. Dana retensi ditransfer ke vendor

### G. Pekerjaan Tambahan

**Mengajukan (Vendor):**
1. Di section Pekerjaan Tambahan, klik **"Ajukan"**
2. Isi judul, nilai, dan deskripsi
3. Upload gambar jika ada

**Menyetujui (Client/Admin):**
1. Lihat daftar pengajuan
2. Klik **✓** untuk setuju atau **✗** untuk tolak
3. Jika disetujui, milestone dan termin baru dibuat

### H. Pengurangan Nilai

**Mengajukan (Vendor):**
1. Di section Pengurangan Nilai, klik **"Ajukan"**
2. Pilih milestone
3. Isi nilai pengurangan dan alasan

**Approval (Client → Admin):**
1. Client klik **✓** untuk setujui
2. Status berubah ke "pending_admin"
3. Admin klik **✓** untuk final approval
4. Milestone diperbarui, termin refund dibuat

---

## 💰 Perhitungan Keuangan

### Fee Admin
- **Client**: 1% dari nilai milestone
- **Vendor**: 2% dari nilai milestone

### Contoh Perhitungan
```
Nilai Milestone: Rp 10.000.000
Fee Client (1%): Rp 100.000
Total Client Bayar: Rp 10.100.000

Fee Vendor (2%): Rp 200.000
Retensi (5%): Rp 500.000
Vendor Terima: Rp 9.300.000
```

---

## 🔧 Konfigurasi

### Environment Variables
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
ADMIN_EMAIL="admin@yourdomain.com"
```

### Email SMTP
Aplikasi menggunakan Gmail SMTP:
- Host: smtp.gmail.com
- Port: 587
- Memerlukan App Password (bukan password biasa)

---

## 📱 Responsif

Aplikasi sudah responsif untuk:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

---

## 🎨 Desain

- **Tema**: Glassmorphism dengan dark mode
- **Warna Utama**: #FF9013 (Oranye)
- **Font**: Plus Jakarta Sans
- **Bahasa**: Indonesia

---

## 🛠️ Teknologi

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (Prisma ORM)
- **Auth**: JWT + OTP via Email
- **Email**: Nodemailer + Gmail SMTP

---

## 📞 Dukungan

Untuk pertanyaan atau bantuan, hubungi:
- Email: aplikasipuyowongkito@gmail.com

---

© 2025 Adogalo. All rights reserved.
