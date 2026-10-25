# ☕ Academic Virtual Office
> **Personal Multi-Agent AI Office Assistant for College Students**  
> *Minimalist Aesthetic Edition • Local-First Architecture*

![Academic Office Banner](public/avatars/cantika.jpg)

**Academic Virtual Office** adalah sistem asisten pintar otonom (*AI Multi-Agent System*) berbasis lokal yang dirancang khusus untuk memanajemen seluruh aktivitas perkuliahan mahasiswa secara otomatis. Mengusung konsep **kantor virtual bertema Minimalist Aesthetic**, sistem ini mengintegrasikan sapaan otomatis sistem operasi (*Windows Startup*), manajemen jadwal dinamis, pengolahan dokumen akademik dua arah, dan pengorganisasian berkas lokal di File Explorer.

---

## 🌟 Fitur Utama (Key Features)

### 1. 🔔 Center-Screen Startup Notification
* Setiap kali laptop dinyalakan atau dibuka, sistem memunculkan jendela estetis tepat di **tengah layar monitor**:  
  **`"Ada tugas apa hari ini, Ma'am?"`**
* Terintegrasi langsung dengan Windows Startup melalui skrip `.vbs` dan PowerShell GUI tanpa konsol hitam.

### 2. 📅 Smart Weekly Reschedule & Auto-Revert Logic
* Menerima instruksi pemindahan jam kuliah untuk minggu tertentu (misal: *"Ubah jam kuliah PBO minggu ini jadi jam 8 malam"*).
* **Auto-Revert:** Jadwal pengganti hanya berlaku untuk minggu berjalan. Begitu hari Minggu pukul 23:59 lewat, sistem otomatis mengembalikan jadwal ke jadwal master normal.

### 3. 🔄 Konversi Dokumen Dua Arah (DOC ⇄ PDF)
* **DOC ke PDF:** Memformat tugas sesuai standar penulisan karya ilmiah kampus (margin 4-3-3-3, font Times New Roman) siap cetak/kumpul.
* **PDF ke DOC / Word:** Mengekstrak isi berkas PDF terkunci menjadi dokumen `.doc` (Microsoft Word) resmi yang bisa diedit kembali.

### 4. 📁 File Explorer & Media Organization
* Membuat folder mata kuliah baru dan memindahkan berkas tugas, foto materi catatan, dan rekaman video Zoom kuliah ke direktori yang rapi.

---

## 👥 Tim Asisten Virtual (The AI Agents)

| Asisten | Peran | Tampilan Karakter & Spesialisasi |
| :--- | :--- | :--- |
| **👩‍💼 Cantika** | *Executive Academic Secretary* | Blouse kerah tinggi, blazer pas badan, rambut sanggul (*elegant bun*), anting mutiara kecil, meja biru keabuan. Mengatur jadwal harian, reschedule mingguan, dan deadline tugas. |
| **👩‍💼 Rexha** | *Document & Converter Specialist* | Blazer formal, lanyard kartu kantor di leher, rambut rapi profesional, meja cream kayu. Menangani konversi 2 arah (DOC $\leftrightarrow$ PDF) dan template cover tugas resmi. |
| **👨‍💻 Hendry** | *File & Storage Organizer* | Kemeja lengan panjang, kacamata tebal (*thick glasses*), meja coklat kayu. Mengatur File Explorer, membuat folder baru, dan merapikan foto/video kuliah. |

---

## 🚀 Cara Menjalankan (Installation & Usage)

### 1. Clone Repositori
```bash
git clone https://github.com/raatuuuu26/academic-virtual-office.git
cd academic-virtual-office
```

### 2. Jalankan Server Kantor Virtual
Pastikan [Node.js](https://nodejs.org/) sudah terpasang, lalu jalankan:
```bash
node server.js
```

### 3. Buka di Browser
Buka tautan lokal:
👉 **[http://localhost:3000](http://localhost:3000)**

### 4. Aktifkan Notifikasi Startup Windows (Opsional)
Salin berkas `Notifikasi_Kuliah_Cantika.vbs` ke folder Startup Windows:
1. Tekan tombol `Windows + R` di keyboard.
2. Ketik `shell:startup` lalu tekan Enter.
3. Tempelkan shortcut berkas `Notifikasi_Kuliah_Cantika.vbs` di folder tersebut.

---

## 🛠️ Tech Stack
* **Runtime:** Node.js (Local HTTP Server)
* **Frontend:** HTML5, Modern CSS3 Grid (`repeat(3, minmax(0, 1fr))`), Plus Jakarta Sans & Playfair Display typography
* **Vector & Pixel Art:** Custom SVG & Pixel Art Character Sprites
* **OS Automation:** Windows Script Host (`.vbs`), PowerShell Desktop GUI Form
* **Database:** JSON Persistent Storage (`academic_data.json`)
* **Privacy:** 100% Local-First Architecture

---
*Created with ❤️ by [raatuuuu26](https://github.com/raatuuuu26)*
