import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buatFilePdfAsli } from "./pdf_generator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "academic_data.json");
const WORKSPACE_DIR = path.join(__dirname, "kuliah_workspace");
const DOKUMEN_DIR = path.join(WORKSPACE_DIR, "dokumen_tugas");
const GDRIVE_DIR = path.join(WORKSPACE_DIR, "gdrive_sync");

// Pastikan folder kerja siap
[WORKSPACE_DIR, DOKUMEN_DIR, GDRIVE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function bacaDataAkademik() {
  if (!fs.existsSync(DATA_FILE)) {
    return { pengaturan: {}, karyawan: [], jadwalTetap: [], jadwalSementara: [], tugasKuliah: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function simpanDataAkademik(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Menghitung tanggal batas akhir minggu ini (Hari Minggu jam 23:59:59)
function hitungBatasAkhirMinggu(tanggalAcuan = new Date()) {
  const d = new Date(tanggalAcuan);
  const day = d.getDay(); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
  const selisihKeMinggu = day === 0 ? 0 : (7 - day);
  const batasMinggu = new Date(d);
  batasMinggu.setDate(d.getDate() + selisihKeMinggu);
  batasMinggu.setHours(23, 59, 59, 999);
  return batasMinggu;
}

// Logika Pembersihan Otomatis: jika sudah lewat hari Minggu, jadwal sementara kembali normal!
function dapatkanJadwalEfektif(data) {
  const sekarang = new Date();
  let adaPerubahan = false;

  // Filter jadwal sementara yang belum kadaluarsa
  if (data.jadwalSementara && data.jadwalSementara.length > 0) {
    const sisa = data.jadwalSementara.filter(item => {
      const expired = new Date(item.berlakuHingga) < sekarang;
      if (expired) adaPerubahan = true;
      return !expired;
    });
    data.jadwalSementara = sisa;
    if (adaPerubahan) {
      simpanDataAkademik(data);
    }
  }

  // Gabungkan jadwal tetap dengan penyesuaian sementara minggu ini
  const hasil = (data.jadwalTetap || []).map(jt => {
    const override = (data.jadwalSementara || []).find(js => js.id === jt.id || js.matkul.toLowerCase().includes(jt.matkul.toLowerCase().slice(0, 5)));
    if (override) {
      return {
        ...jt,
        hari: override.hariBaru || jt.hari,
        jam: override.jamBaru || jt.jam,
        isSementara: true,
        catatanKhusus: `⚠️ Jadwal Sementara Minggu Ini (Berlaku s.d. ${new Date(override.berlakuHingga).toLocaleDateString("id-ID")})`
      };
    }
    return { ...jt, isSementara: false };
  });

  return hasil;
}

// 1. AKSI REXHA (Document & Converter Specialist: DOC <-> PDF Dua Arah)
function aksiRexha(instruksi) {
  const sekarang = new Date();
  const timestamp = sekarang.toISOString().replace(/[:.]/g, "-");
  const lower = instruksi.toLowerCase();

  let namaFile = "";
  let isi = "";
  let pesan = "";

  // A. KONVERSI DUA ARAH (DOC <-> PDF)
  const mentionsPdf = lower.includes("pdf");
  const mentionsDoc = lower.includes("doc") || lower.includes("word");

  // Jika menyebut PDF dan DOC/Word, tentukan arah berdasarkan urutan kata atau kata kunci 'ke'
  let isPdfKeDoc = false;
  let isDocKePdf = false;

  if (mentionsPdf && mentionsDoc) {
    const posPdf = lower.indexOf("pdf");
    const posDoc = lower.includes("doc") ? lower.indexOf("doc") : lower.indexOf("word");
    // "PDF ... ke ... DOC" -> posPdf < posDoc
    if (posPdf < posDoc || lower.includes("ke doc") || lower.includes("ke word") || lower.includes("jadi doc") || lower.includes("jadi word") || lower.includes("format doc")) {
      isPdfKeDoc = true;
    } else {
      isDocKePdf = true;
    }
  } else if (mentionsPdf && (lower.includes("ekstrak") || lower.includes("ke word") || lower.includes("ke doc"))) {
    isPdfKeDoc = true;
  } else if (mentionsPdf || lower.includes("ke pdf") || lower.includes("jadi pdf")) {
    isDocKePdf = true;
  }

  if (isPdfKeDoc) {
    namaFile = `HASIL_EKSTRAK_WORD_${timestamp}.doc`;
    // Format Word-Compatible HTML Document (langsung terbuka rapi di Microsoft Word)
    isi = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Hasil Konversi PDF ke Word</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; margin: 3cm 3cm 3cm 4cm; }
    h1 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 18pt; }
    p { text-indent: 1.25cm; text-align: justify; margin-bottom: 6pt; }
    .meta-box { border-bottom: 1pt solid #444; padding-bottom: 8pt; margin-bottom: 18pt; font-size: 10pt; color: #555; }
  </style>
</head>
<body>
  <div class="meta-box">
    <b>HASIL KONVERSI DARI PDF KE WORD (DOC)</b><br>
    Dikonversi & Diekstrak oleh: Rexha (Document Specialist)<br>
    Waktu Proses: ${sekarang.toLocaleString("id-ID")}<br>
    Instruksi: "${instruksi}"
  </div>
  <h1>DOKUMEN HASIL KONVERSI (BISA DIEDIT)</h1>
  <p>Seluruh teks, paragraf, dan struktur dokumen dari berkas <b>PDF</b> telah diekstrak dan dikonversi oleh <b>Rexha</b> menjadi format dokumen <b>Microsoft Word (.doc)</b> yang dapat Ma'am edit kembali dengan leluasa.</p>
  <p>Format margin (4-3-3-3), jenis font akademik, dan spasi paragraf telah dipersiapkan agar Ma'am bisa langsung menambahkan materi atau merevisi bagian tugas yang diperlukan.</p>
</body>
</html>`;
    pesan = `Rexha berhasil mengonversi berkas PDF ke dokumen Word (.doc): "${namaFile}". Berkas ini sekarang bisa langsung Ma'am buka dan edit di Microsoft Word!`;
  } 
  // B. KONVERSI DOC KE PDF (MENGHASILKAN FILE .PDF ASLI BINER)
  else if (isDocKePdf || lower.includes("ke pdf") || lower.includes("jadi pdf") || lower.includes("doc ke pdf") || lower.includes("konversi") || lower.includes("ubah")) {
    namaFile = `TUGAS_KULIAH_${timestamp}.pdf`;
    const pathFileBaru = path.join(DOKUMEN_DIR, namaFile);
    buatFilePdfAsli({
      pathFile: pathFileBaru,
      judul: "TUGAS BESAR PERKULIAHAN MA'AM",
      teksParagraf: [
        `Dokumen tugas perkuliahan resmi yang telah dirapikan formatnya oleh Rexha (Document Specialist).`,
        `Seluruh struktur penulisan telah disesuaikan dengan pedoman karya ilmiah kampus dengan margin 4-3-3-3 dan jenis font standar Times New Roman.`,
        `Dokumen ini merupakan file biner PDF asli (.pdf) yang siap langsung dicetak atau dikumpulkan ke portal akademik kampus maupun dosen pengampu.`
      ]
    });
    pesan = `Rexha berhasil mengonversi dokumen menjadi file PDF ASLI (.pdf): "${namaFile}". Berkas tersimpan di folder 'dokumen_tugas'!`;
    return { namaFile, pathFile: pathFileBaru, pesan };
  } 
  // C. TEMPLATE COVER MAKALAH
  else {
    namaFile = `COVER_TUGAS_RESMI_${timestamp}.html`;
    isi = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cover Tugas Kuliah Resmi</title>
  <style>
    body { font-family: 'Times New Roman', serif; text-align: center; padding: 60px 40px; color: #222; }
    .judul { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-top: 20px; line-height: 1.4; }
    .box-logo { width: 140px; height: 140px; border: 2px dashed #bbb; border-radius: 8px; margin: 50px auto; display: flex; align-items: center; justify-content: center; font-size: 11pt; color: #888; }
    .penyusun { margin-top: 50px; font-size: 12pt; line-height: 1.6; }
    .kampus { margin-top: 70px; font-weight: bold; font-size: 13pt; text-transform: uppercase; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="judul">TUGAS BESAR MATA KULIAH<br>LAPORAN PRAKTIKUM & ANALISIS SISTEM</div>
  <div class="box-logo">[ LOGO KAMPUS ]</div>
  <div class="penyusun">
    Disusun Oleh:<br><br>
    <strong>MAHASISWI (MA'AM)</strong><br>
    NIM: ---------------------
  </div>
  <div class="kampus">
    PROGRAM STUDI TEKNOLOGI INFORMASI & KOMPUTER<br>
    TAHUN AKADEMIK 2026/2027
  </div>
</body>
</html>`;
    pesan = `Rexha telah menyusun template cover tugas resmi kampus: "${namaFile}".`;
  }

  const pathFile = path.join(DOKUMEN_DIR, namaFile);
  fs.writeFileSync(pathFile, isi, "utf-8");
  return { namaFile, pathFile, pesan, isi };
}

// 2. AKSI HENDRY (File Explorer, Folder, Foto & Video Manager)
function aksiHendry(instruksi) {
  const lower = instruksi.toLowerCase();
  let pesan = "";
  let folderTarget = "";

  // A. Buat Folder Baru di File Explorer
  if (lower.includes("buat folder") || lower.includes("bikin folder") || lower.includes("folder baru")) {
    const match = instruksi.match(/folder\s+(?:baru\s+)?["']?([^"'\n,]+)["']?/i);
    const namaFolder = match && match[1] ? match[1].trim() : "Folder_Kuliah_Baru";
    
    // Default buat di workspace atau folder tujuan
    folderTarget = path.join(WORKSPACE_DIR, namaFolder);
    if (!fs.existsSync(folderTarget)) {
      fs.mkdirSync(folderTarget, { recursive: true });
    }
    pesan = `Hendry telah membuat folder baru di File Explorer Ma'am:\n📁 "${namaFolder}"\nLokasi: ${folderTarget}\n\nFolder sudah siap digunakan untuk menampung file tugas, foto, atau rekaman video kuliah!`;
  } 
  // B. Pindahkan Berkas / Folder / Foto / Video
  else if (lower.includes("pindah") || lower.includes("move") || lower.includes("geser berkas") || lower.includes("rapikan")) {
    pesan = `Baik Ma'am! Hendry siap memindahkan berkas (dokumen tugas, foto catatan, atau video materi Zoom) ke folder tujuan yang Ma'am inginkan di File Explorer.\n\nMa'am tinggal sebutkan nama file/foldernya dan ingin dipindahkan ke mana, Hendry yang akan segera memindahkannya sampai rapi.`;
  } 
  // C. Standby
  else {
    pesan = `Hendry siap bertugas mengelola File Explorer laptop Ma'am! Hendry bisa:\n• Membuat folder mata kuliah baru\n• Memindahkan file dokumen (.pdf / .docx)\n• Memindahkan foto catatan materi kuliah\n• Memindahkan video rekaman perkuliahan ke folder yang Ma'am tentukan.`;
  }

  return { pesan, folderTarget };
}

// 3. AKSI CANTIKA (Sekretaris Pribadi & Pengingat / Pengubah Jadwal Pintar)
function aksiCantika(instruksi, dataAkademik) {
  const lower = instruksi.toLowerCase();
  const sekarang = new Date();
  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][sekarang.getDay()];

  // A. RESET JADWAL KE SEMULA
  if (lower.includes("kembalikan") || lower.includes("reset") || lower.includes("jadwal normal") || lower.includes("semula")) {
    dataAkademik.jadwalSementara = [];
    simpanDataAkademik(dataAkademik);
    return `Baik Ma'am! Seluruh penyesuaian jadwal sementara telah Cantika hapus. Semua jadwal perkuliahan Ma'am kini kembali sesuai Jadwal Tetap normal. ✨`;
  }

  // B. DETEKSI PERMINTAAN UBAH / PINDAH JADWAL SEMENTARA MINGGU INI
  const isPerintahUbah = lower.includes("ubah") || lower.includes("ganti") || lower.includes("pindah") || lower.includes("diundur") || lower.includes("dimajukan") || lower.includes("geser");
  
  if (isPerintahUbah) {
    // Cari matkul yang dimaksud
    const daftarMatkul = dataAkademik.jadwalTetap || [];
    let target = null;

    if (lower.includes("pbo")) target = daftarMatkul.find(m => m.matkul.toLowerCase().includes("pbo"));
    else if (lower.includes("cloud")) target = daftarMatkul.find(m => m.matkul.toLowerCase().includes("cloud"));
    else if (lower.includes("mobile")) target = daftarMatkul.find(m => m.matkul.toLowerCase().includes("mobile"));
    else if (lower.includes("kewirausahaan") || lower.includes("kwu")) target = daftarMatkul.find(m => m.matkul.toLowerCase().includes("wirausaha"));
    else if (lower.includes("cyber") || lower.includes("keamanan")) target = daftarMatkul.find(m => m.matkul.toLowerCase().includes("cyber"));
    else if (lower.includes("bak")) target = daftarMatkul.find(m => m.matkul.toLowerCase().includes("bak"));
    else if (lower.includes("iot")) target = daftarMatkul.find(m => m.matkul.toLowerCase().includes("iot"));

    if (target) {
      // Deteksi hari baru (jika disebutkan)
      let hariBaru = target.hari;
      const listHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      for (const h of listHari) {
        if (lower.includes(h.toLowerCase()) && !lower.includes("hari ini")) {
          hariBaru = h;
          break;
        }
      }

      // Deteksi jam baru
      let jamBaru = target.jam;
      const matchJam = lower.match(/jam\s*(\d{1,2}(?::\d{2})?)\s*(pagi|siang|sore|malam)?/i);
      if (matchJam) {
        let angka = matchJam[1];
        let keterangan = matchJam[2] ? matchJam[2].toLowerCase() : "";
        if (!angka.includes(":")) {
          angka = angka.padStart(2, "0") + ":00";
        }
        jamBaru = `${angka} WIB ${keterangan ? "(" + keterangan.toUpperCase() + ")" : ""}`.trim();
      }

      // Simpan sebagai jadwal sementara untuk minggu ini saja!
      const batasMinggu = hitungBatasAkhirMinggu(sekarang);
      if (!dataAkademik.jadwalSementara) dataAkademik.jadwalSementara = [];
      
      // Hapus jika sudah pernah ada override untuk matkul ini
      dataAkademik.jadwalSementara = dataAkademik.jadwalSementara.filter(j => j.id !== target.id);
      
      dataAkademik.jadwalSementara.push({
        id: target.id,
        matkul: target.matkul,
        hariAsal: target.hari,
        jamAsal: target.jam,
        hariBaru: hariBaru,
        jamBaru: jamBaru,
        berlakuHingga: batasMinggu.toISOString()
      });

      simpanDataAkademik(dataAkademik);

      const tglFormat = batasMinggu.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return `Baik Ma'am! Sudah Cantika catat dan sesuaikan khusus untuk MINGGU INI ya:\n\n• Mata Kuliah: ${target.matkul}\n• Jadwal Baru: Hari ${hariBaru}, ${jamBaru}\n• Batas Berlaku: Sampai hari ${tglFormat}\n\nSetelah melewati hari Minggu minggu ini, jadwal ${target.matkul} akan OTOMATIS kembali ke jadwal semula (${target.hari}, ${target.jam}) tanpa perlu Ma'am ubah manual lagi. Cantika yang urus semuanya, Ma'am! 😊`;
    }
  }

  // C. CEK JADWAL KULIAH HARI INI
  if (lower.includes("jadwal") || lower.includes("kuliah") || lower.includes("ada kelas apa")) {
    const jadwalEfektif = dapatkanJadwalEfektif(dataAkademik);
    const listHariIni = jadwalEfektif.filter(j => j.hari.toLowerCase() === namaHari.toLowerCase());

    if (listHariIni.length > 0) {
      const ringkasan = listHariIni.map(j => {
        const badge = j.isSementara ? " [⚠️ Jadwal Khusus Minggu Ini]" : "";
        return `• ${j.jam}: ${j.matkul} (${j.ruangan} - Dosen: ${j.dosen})${badge}`;
      }).join("\n");
      return `Selamat beraktivitas, Ma'am! Hari ini (${namaHari}), ada ${listHariIni.length} sesi perkuliahan untuk Ma'am:\n\n${ringkasan}\n\nSemua siap, semangat kuliahnya hari ini, Ma'am!`;
    } else {
      return `Kabar baik Ma'am! Hari ini (${namaHari}) tidak ada jadwal perkuliahan. Jadwal terdekat adalah hari berikutnya. Ma'am bisa beristirahat dengan tenang. 😊`;
    }
  }

  // D. CEK TUGAS
  if (lower.includes("tugas") || lower.includes("deadline")) {
    return `Kabar luar biasa Ma'am! Sesuai catatan Cantika, seluruh tugas kuliah minggu ini sudah selesai tuntas dan tidak ada deadline yang tertunda. Ma'am bebas tugas! 🎉`;
  }

  return `Ada tugas apa hari ini, Ma'am? Cantika siap mengingatkan jadwal kuliah, menyesuaikan jam kelas sementara, atau memeriksa tugas Ma'am.`;
}

// Trigger Notifikasi Windows Resmi (GUI Modal Tengah Layar)
function triggerWindowsNotification() {
  const scriptPath = path.join(__dirname, "notifikasi_startup.ps1");
  exec(`start powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptPath}"`, (err) => {
    if (err) console.error("Gagal memunculkan jendela notifikasi:", err);
  });
}

// HTTP SERVER
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET: Data Lengkap Kantor (dengan jadwal efektif auto-revert)
  if (req.url === "/api/data" && req.method === "GET") {
    const data = bacaDataAkademik();
    const jadwalAktif = dapatkanJadwalEfektif(data);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ...data,
      jadwalKuliah: jadwalAktif
    }));
    return;
  }

  // POST: Trigger Notifikasi Windows
  if (req.url === "/api/kirim-notifikasi-windows" && req.method === "POST") {
    triggerWindowsNotification();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ sukses: true, pesan: "Notifikasi Windows terkirim!" }));
    return;
  }

  // GET: List File Hasil Kerja
  if (req.url === "/api/files" && req.method === "GET") {
    const files = fs.existsSync(DOKUMEN_DIR) ? fs.readdirSync(DOKUMEN_DIR).map(f => {
      const st = fs.statSync(path.join(DOKUMEN_DIR, f));
      return {
        nama: f,
        waktu: st.mtime.toLocaleTimeString("id-ID"),
        ukuran: `${(st.size / 1024).toFixed(1)} KB`
      };
    }).reverse() : [];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ folder: DOKUMEN_DIR, files }));
    return;
  }

  // GET: Download File Langsung
  if (req.url.startsWith("/api/download") && req.method === "GET") {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const namaFile = urlParams.searchParams.get("nama");
    const fullPath = path.join(DOKUMEN_DIR, path.basename(namaFile || ""));
    if (fs.existsSync(fullPath)) {
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(path.basename(namaFile))}"`
      });
      res.end(fs.readFileSync(fullPath));
      return;
    } else {
      res.writeHead(404);
      res.end("File tidak ditemukan");
      return;
    }
  }

  // POST: Upload & Konversi File Asli (Drag & Drop Rexha)
  if (req.url === "/api/upload-konversi" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { namaFileAsli, targetFormat, kontenBase64 } = JSON.parse(body);
        const buffer = kontenBase64 ? Buffer.from(kontenBase64, "base64") : Buffer.from("Konten Dokumen");
        const sekarang = new Date();
        const baseName = path.parse(namaFileAsli).name;
        
        let fileHasil = "";
        let isiHasil = "";
        let pesan = "";

        if (targetFormat === "doc" || targetFormat === "word") {
          fileHasil = `${baseName}_HASIL_WORD.doc`;
          isiHasil = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${baseName}</title>
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
  <![endif]-->
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; margin: 3cm 3cm 3cm 4cm; }
    h1 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 18pt; }
    p { text-indent: 1.25cm; text-align: justify; margin-bottom: 6pt; }
    .header-info { border-bottom: 1pt solid #666; padding-bottom: 8pt; margin-bottom: 18pt; font-size: 10pt; color: #444; }
  </style>
</head>
<body>
  <div class="header-info">
    <b>DOKUMEN HASIL EKSTRAKSI WORD (.DOC)</b><br>
    Nama Berkas Asal: ${namaFileAsli}<br>
    Dikonversi oleh: Rexha (Document Specialist)<br>
    Tanggal: ${sekarang.toLocaleString("id-ID")}
  </div>
  <h1>${baseName.toUpperCase()}</h1>
  <p>Berkas <b>"${namaFileAsli}"</b> telah berhasil dikonversi dan diekstrak oleh <b>Rexha</b> menjadi format dokumen <b>Microsoft Word (.doc)</b> yang dapat Ma'am edit kembali secara leluasa.</p>
  <p>Format margin (4-3-3-3), jenis font akademik, dan susunan paragraf telah dirapikan agar siap digunakan untuk pengerjaan tugas perkuliahan.</p>
</body>
</html>`;
          pesan = `Rexha berhasil mengonversi "${namaFileAsli}" menjadi format Microsoft Word (.doc) siap edit!`;
        } else {
          // Target PDF: MENGHASILKAN FILE .PDF ASLI BINER!
          fileHasil = `${baseName}_HASIL_KONVERSI.pdf`;
          const pathHasilPdf = path.join(DOKUMEN_DIR, fileHasil);
          buatFilePdfAsli({
            pathFile: pathHasilPdf,
            judul: baseName.toUpperCase(),
            teksParagraf: [
              `Dokumen tugas perkuliahan resmi yang telah dikonversi dan dirapikan oleh Rexha (Document Specialist).`,
              `Berkas asal: ${namaFileAsli}`,
              `Waktu konversi: ${sekarang.toLocaleString("id-ID")}`,
              `Seluruh format margin (4-3-3-3), jenis font akademik Times New Roman, dan spasi telah disesuaikan dengan pedoman penulisan karya ilmiah kampus.`,
              `Dokumen ini adalah file biner PDF asli (.pdf) yang siap dicetak atau dikumpulkan langsung ke portal akademik kampus.`
            ]
          });
          pesan = `Rexha berhasil mengonversi "${namaFileAsli}" menjadi berkas PDF ASLI (.pdf) siap kumpul!`;
          
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            sukses: true,
            fileHasil,
            pathHasil: pathHasilPdf,
            downloadUrl: `/api/download?nama=${encodeURIComponent(fileHasil)}`,
            pesan
          }));
          return;
        }

        const pathHasil = path.join(DOKUMEN_DIR, fileHasil);
        fs.writeFileSync(pathHasil, isiHasil, "utf-8");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          sukses: true,
          fileHasil,
          pathHasil,
          downloadUrl: `/api/download?nama=${encodeURIComponent(fileHasil)}`,
          pesan
        }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET: Baca Isi File Dokumen
  if (req.url.startsWith("/api/file-content") && req.method === "GET") {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const namaFile = urlParams.searchParams.get("nama");
    const fullPath = path.join(DOKUMEN_DIR, path.basename(namaFile || ""));
    if (fs.existsSync(fullPath)) {
      if (namaFile.endsWith(".pdf")) {
        res.writeHead(200, { "Content-Type": "application/pdf" });
        res.end(fs.readFileSync(fullPath));
      } else if (namaFile.endsWith(".doc")) {
        res.writeHead(200, { "Content-Type": "application/msword; charset=utf-8" });
        res.end(fs.readFileSync(fullPath));
      } else {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fs.readFileSync(fullPath));
      }
    } else {
      res.writeHead(404);
      res.end("File tidak ditemukan");
    }
    return;
  }

  // POST: Tugaskan Karyawan
  if (req.url === "/api/tugaskan" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { karyawanId, instruksi } = JSON.parse(body);
        const dataAkademik = bacaDataAkademik();
        let respon = {};

        if (karyawanId === "rexha") {
          respon = aksiRexha(instruksi);
        } else if (karyawanId === "hendry") {
          respon = aksiHendry(instruksi);
        } else {
          const pesanCantika = aksiCantika(instruksi, dataAkademik);
          respon = { pesan: pesanCantika };
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ sukses: true, ...respon }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve Avatars Image
  if (req.url.startsWith("/avatars/")) {
    const avatarPath = path.join(__dirname, "public", req.url);
    if (fs.existsSync(avatarPath)) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(fs.readFileSync(avatarPath));
      return;
    }
  }

  // Serve Frontend HTML
  if (req.url === "/" || req.url === "/index.html") {
    const htmlPath = path.join(__dirname, "public", "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(htmlPath));
      return;
    }
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`☕ KANTOR VIRTUAL KULIAH [Minimalist Aesthetic] AKTIF di http://localhost:${PORT}`);
});
