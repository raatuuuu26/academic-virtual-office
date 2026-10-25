# 📘 PANDUAN PENGGUNA LENGKAP & KUSTUMISASI KANTOR VIRTUAL
*Personal Academic Virtual Office • Minimalist Aesthetic Edition*

Selamat datang di **Academic Virtual Office**, kantor asisten kuliah virtual pribadi Anda yang dirancang untuk membantu perkuliahan, konversi dokumen tugas, perangkuman modul belajar, dan pemantauan jadwal kuliah harian.

---

## 🛡️ 1. Peringatan Privasi & Izin Akses File Explorer

### Mengapa Asisten Membutuhkan Akses Folder?
Asisten virtual Anda (Rexha dan Hendry) bekerja langsung dengan berkas nyata di laptop Anda:
- Mengubah format dokumen tugas Word (`.doc`) ke berkas PDF asli siap cetak (`.pdf`).
- Mengubah materi kuliah dan modul menjadi ringkasan catatan belajar Microsoft Word (`.doc`).
- Menyimpan seluruh berkas di folder kerja lokal Anda.

### Jaminan Keamanan & Privasi (100% Local-First):
1. **Tidak Ada Cloud Publik / Server Pihak Ketiga:** Seluruh proses berjalan di laptop Anda sendiri (`http://localhost:3000`). Data tidak pernah dikirim ke internet.
2. **Wilayah Folder Terisolasi:** Asisten hanya membaca dan menulis berkas di dalam subdirektori kerja khusus:
   `C:\Users\<user>\...\kuliah_workspace\`
3. **Kendali Penuh di Tangan Anda:** Anda dapat membuka, memindahkan, menyalin, atau menghapus berkas kapan saja langsung dari Windows File Explorer.

---

## 👤 2. Cara Mengganti Nama Panggilan Anda (Callsign)

Apakah Anda ingin dipanggil selain *"Ma'am"* (misalnya: *"Kak"*, *"Mbak"*, *"Bro"*, atau nama panggilan Anda sendiri)?

### Cara Termudah (Lewat Antarmuka Web):
1. Buka kantor virtual di browser: [http://localhost:3000](http://localhost:3000).
2. Klik tombol **`⚙️ Pengaturan`** di pojok kanan atas layar.
3. Pada kolom **"Nama Panggilan Anda (Callsign)"**, ketikkan panggilan yang diinginkan (contoh: `Kak Ratu`).
4. Klik tombol **`💾 Simpan Perubahan Pengaturan`**.
5. Sapaan di layar dan respon asisten Cantika akan otomatis menyesuaikan menjadi: *"Ada tugas apa hari ini, Kak Ratu?"*

### Cara Alternatif (Lewat File Konfigurasi):
Buka file `academic_data.json`, lalu ubah baris:
```json
"pengaturan": {
  "namaPanggilan": "Kak Ratu"
}
```

---

## 👥 3. Cara Mengganti Nama Karyawan (Asisten Anda)

Anda bebas menamai ketiga asisten virtual sesuai kenyamanan Anda!

| Peran Default | Nama Default | Fungsi Utama |
| :--- | :--- | :--- |
| **Sekretaris Eksekutif** | **Cantika** | Pengingat jadwal harian, notifikasi sapaan, penyesuaian jam kelas sementara. |
| **Converter Dokumen** | **Rexha** | Konversi dokumen 2 arah: DOC $\leftrightarrow$ PDF (format biner siap kumpul). |
| **Study Notes & Summarizer** | **Hendry** | Rangkum berkas materi/slide kuliah jadi dokumen Word (`.doc`) siap edit. |

### Cara Mengganti Nama:
1. Klik tombol **`⚙️ Pengaturan`** di pojok kanan atas web.
2. Di bagian **"Nama Asisten Virtual Pribadi"**, ubah nama yang Anda inginkan (misal: Cantika diganti *Ayu*, Rexha diganti *Sari*, dsb).
3. Klik **`💾 Simpan Perubahan Pengaturan`**.
4. Kartu meja kerja dan sistem auto-routing akan langsung mengenali nama asisten baru Anda.

---

## 📅 4. Cara Mengatur & Menambah Jadwal Kuliah (Termasuk Hari Sabtu / Minggu)

Jika Anda memiliki kelas di hari **Sabtu (Weekend)** atau **Minggu**:

### Cara Melalui Menu Pengaturan Web:
1. Klik **`⚙️ Pengaturan`** di pojok kanan atas.
2. Gulir ke bagian **"Atur Jadwal Kuliah Mingguan"**.
3. Klik tombol **`➕ Tambah Mata Kuliah`**.
4. Pilih hari: pilih **Sabtu (Weekend)** atau **Minggu**.
5. Masukkan jam kuliah (contoh: `09:00 WIB`), nama mata kuliah, dan ruang/link Zoom.
6. Klik **`💾 Simpan Perubahan Pengaturan`**.
7. Jadwal baru akan langsung muncul di sidebar jadwal kuliah aktif.

### Cara Melalui Perintah Chat Cantika:
Anda juga bisa berbicara santai kepada Cantika di kotak perintah:
- *"Cantika, tolong pindahkan jadwal PBO minggu ini ke hari Sabtu jam 10 pagi"*
- *"Kuliah Cloud Computing hari Senin diundur jadi jam 8 malam"*
> 💡 *Catatan:* Perubahan yang diminta via chat bersifat **sementara untuk minggu berjalan**, dan akan otomatis kembali ke jadwal normal setelah hari Minggu lewat (auto-revert).

---

## 💬 5. Cara Memasukkan Kritik & Saran

Kami menyediakan kotak masukan langsung di dalam aplikasi agar kantor virtual ini bisa terus disempurnakan:
1. Klik tombol **`💬 Kritik & Saran`** di bagian atas header.
2. Pilih kategori masukan:
   - 💡 *Saran Fitur Baru*
   - 🎨 *Tampilan & Desain (Aesthetic)*
   - 🐛 *Laporan Masalah / Bug*
   - 📝 *Masukan Lainnya*
3. Tulis pesan masukan atau saran Anda secara bebas.
4. Klik **`📤 Kirim Masukan`**.
5. Pesan Anda otomatis dicatat dan diarsipkan secara aman di `feedback_user.json`.

---

## 🚀 6. Alur Kerja Git & CI/CD: "Anti Bom Waktu"

Untuk menjaga kestabilan sistem dan memastikan tidak ada bug yang lolos ke pengguna:

```
[Branch Fitur] ➔ [Small Commits] ➔ [Push ke Branch] ➔ [Buka PR] ➔ [Robot CI Lint & Test] ➔ [Merge ke Main]
```

1. **JANGAN Push Langsung ke `main`:**
   Branch `main` adalah versi produksi stabil. Mendorong perubahan langsung ke `main` berisiko menimbulkan masalah tak terduga (*bom waktu*).
2. **Bekerja di Branch Terpisah:**
   Selalu buat branch baru untuk setiap fitur, misalnya: `feature/user-customization-ci`.
3. **Commit Kecil & Sering:**
   Setiap commit mencakup satu tugas spesifik dengan pesan commit yang jelas.
4. **Buka Pull Request (PR):**
   Buat Pull Request dari branch fitur menuju `main`.
5. **Uji Otomatis Robot CI (GitHub Actions):**
   - Robot CI akan otomatis menjalankan `npm run lint` dan `npm test`.
   - **Jika status MERAH ❌:** Dilarang melakukan merge. Perbaiki kode terlebih dahulu.
   - **Jika status HIJAU ✅:** Seluruh tes lulus, kode aman untuk di-merge ke branch `main`.
