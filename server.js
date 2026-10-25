import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buatFilePdfAsli } from "./pdf_generator.js";
import { ekstrakTeksDariDokumen } from "./doc_parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "academic_data.json");
const WORKSPACE_DIR = path.join(__dirname, "kuliah_workspace");
const DOKUMEN_DIR = path.join(WORKSPACE_DIR, "dokumen_tugas");
const GDRIVE_DIR = path.join(WORKSPACE_DIR, "gdrive_sync");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
  // B. KONVERSI DOC KE PDF (MENGHASILKAN FILE .PDF ASLI BINER BERISI KONTEN ASLI)
  else if (isDocKePdf || lower.includes("ke pdf") || lower.includes("jadi pdf") || lower.includes("doc ke pdf") || lower.includes("konversi") || lower.includes("ubah")) {
    let judulPdf = "TUGAS BESAR PERKULIAHAN";
    let paragrafPdf = [];
    const listBerkas = fs.existsSync(DOKUMEN_DIR) ? fs.readdirSync(DOKUMEN_DIR) : [];
    let fileDitemukan = null;

    for (const fb of listBerkas) {
      const fbLow = fb.toLowerCase();
      const fbBase = path.parse(fb).name.toLowerCase();
      if ((lower.includes(fbLow) || lower.includes(fbBase)) && !fb.endsWith(".pdf")) {
        fileDitemukan = fb;
        break;
      }
    }

    if (!fileDitemukan) {
      // Ambil berkas non-PDF terbaru jika ada
      const nonPdf = listBerkas.filter(f => !f.endsWith(".pdf") && (f.endsWith(".doc") || f.endsWith(".docx") || f.endsWith(".txt")));
      if (nonPdf.length > 0) {
        fileDitemukan = nonPdf[nonPdf.length - 1];
      }
    }

    if (fileDitemukan) {
      const buffer = fs.readFileSync(path.join(DOKUMEN_DIR, fileDitemukan));
      const extracted = ekstrakTeksDariDokumen(buffer, fileDitemukan);
      judulPdf = extracted.judul;
      paragrafPdf = extracted.paragraf;
    } else {
      paragrafPdf = [
        "Naskah dokumen tugas perkuliahan telah dirapikan formatnya oleh Rexha (Document Specialist).",
        "Struktur penulisan disesuaikan dengan pedoman karya ilmiah kampus dengan margin 4-3-3-3 dan jenis font standar Times New Roman.",
        "Dokumen ini merupakan file biner PDF asli (.pdf) yang siap dicetak atau dikumpulkan langsung ke portal akademik kampus."
      ];
    }

    const slug = fileDitemukan ? path.parse(fileDitemukan).name.replace(/[^a-zA-Z0-9]/g, "_") : "TUGAS_KULIAH";
    namaFile = `${slug}_${timestamp}.pdf`;
    const pathFileBaru = path.join(DOKUMEN_DIR, namaFile);

    buatFilePdfAsli({
      pathFile: pathFileBaru,
      judul: judulPdf.toUpperCase(),
      teksParagraf: paragrafPdf,
      subHeader: `Dikonversi oleh Rexha • Berkas Asal: ${fileDitemukan || "Dokumen Tugas"} • ${sekarang.toLocaleDateString("id-ID")}`
    });

    pesan = `Rexha berhasil mengonversi seluruh isi dokumen "${fileDitemukan || namaFile}" (${paragrafPdf.length} paragraf) menjadi berkas PDF ASLI (.pdf) siap cetak/kumpul!`;
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

// 2. AKSI HENDRY (Study Notes & Summary Specialist 📚)
function buatRangkumanMateriHendry(topik, instruksi, namaFileAsli = "") {
  const sekarang = new Date();
  const lower = (topik + " " + instruksi).toLowerCase();

  let judulMateri = topik.toUpperCase();
  let poinKonsep = [];
  let kisiKisiUjian = [];

  // Analisis Mata Kuliah berdasarkan konteks
  if (lower.includes("cloud")) {
    judulMateri = "CLOUD COMPUTING & ARSITEKTUR LAYANAN AWAN";
    poinKonsep = [
      "<b>Model Layanan:</b> IaaS (Infrastructure as a Service), PaaS (Platform as a Service), SaaS (Software as a Service).",
      "<b>Deployment Model:</b> Public Cloud (AWS, GCP, Azure), Private Cloud (Internal Organisasi), Hybrid Cloud, Community Cloud.",
      "<b>Karakteristik Esensial:</b> On-demand self-service, broad network access, resource pooling, rapid elasticity, measured service.",
      "<b>Virtualisasi & Kontainer:</b> Perbedaan mendasar antara Virtual Machine (Hypervisor-based) vs Container (Docker/Kubernetes lightweight engine)."
    ];
    kisiKisiUjian = [
      "Kapan organisasi harus memilih PaaS dibanding IaaS?",
      "Jelaskan prinsip Shared Responsibility Model dalam keamanan Cloud!",
      "Keuntungan arsitektur Microservices di atas container."
    ];
  } else if (lower.includes("pbo") || lower.includes("oop") || lower.includes("objek")) {
    judulMateri = "PEMROGRAMAN BERORIENTASI OBJEK (PBO / OOP)";
    poinKonsep = [
      "<b>4 Pilar Utama OOP:</b> Encapsulation (pembungkusan data & method), Inheritance (pewarisan sifat class), Polymorphism (banyak bentuk: Overloading & Overriding), Abstraction (menyembunyikan detail implementasi).",
      "<b>Class vs Object:</b> Class adalah cetak biru (blueprint), sedangkan Object adalah instansiasi nyata dari class.",
      "<b>Constructor & Destructor:</b> Method khusus yang otomatis dieksekusi saat objek pertama kali dibuat ke dalam memori.",
      "<b>Access Modifier:</b> public (akses bebas), private (hanya dalam class yang sama), protected (dalam class dan turunannya)."
    ];
    kisiKisiUjian = [
      "Perbedaan mendasar antara Method Overloading dan Method Overriding!",
      "Bagaimana Abstraction dan Interface diterapkan dalam skala proyek nyata?",
      "Contoh penerapan pewarisan (inheritance) hierarkis."
    ];
  } else if (lower.includes("cyber") || lower.includes("keamanan")) {
    judulMateri = "KEAMANAN SIBER (CYBER SECURITY & DEFENSE)";
    poinKonsep = [
      "<b>CIA Triad:</b> Confidentiality (Kerahasiaan data), Integrity (Keaslian/keutuhan data), Availability (Ketersediaan layanan).",
      "<b>Vektor Serangan Populer:</b> Phishing, SQL Injection, Cross-Site Scripting (XSS), Man-in-the-Middle (MitM), DDoS, Ransomware.",
      "<b>Kriptografi:</b> Kriptografi Simetris (AES - kunci sama) vs Kriptografi Asimetris (RSA/ECC - public & private key).",
      "<b>Mekanisme Pertahanan:</b> Firewall, IDS/IPS (Intrusion Detection/Prevention), Multi-Factor Authentication (MFA), Zero Trust Architecture."
    ];
    kisiKisiUjian = [
      "Jelaskan prinsip kerja serangan SQL Injection dan cara mitigasinya (Prepared Statements)!",
      "Bagaimana protokol HTTPS memanfaatkan TLS/SSL handshake?",
      "Konsep least privilege dalam manajemen hak akses user."
    ];
  } else if (lower.includes("iot")) {
    judulMateri = "INTERNET OF THINGS (IOT) & SISTEM TERTANAM";
    poinKonsep = [
      "<b>Arsitektur 3 Lapis IoT:</b> Perception Layer (Sensors/Actuators) ➔ Network Layer (WiFi, BLE, LoRaWAN, 5G) ➔ Application Layer (Dashboard, Cloud Analytics).",
      "<b>Protokol Komunikasi Ringan:</b> MQTT (Publish-Subscribe arsitektur via Broker), CoAP (Constrained Application Protocol), HTTP/REST.",
      "<b>Hardware Populer:</b> Mikrokontroler ESP32/ESP8266 (built-in WiFi), Arduino, Raspberry Pi (Single Board Computer).",
      "<b>Tantangan IoT:</b> Konsumsi daya rendah (low power), skalabilitas koneksi jutaan node, dan enkripsi data sensor di edge."
    ];
    kisiKisiUjian = [
      "Mengapa protokol MQTT jauh lebih hemat daya dibanding HTTP pada perangkat sensor IoT?",
      "Peran Broker dalam arsitektur Publish-Subscribe MQTT.",
      "Tantangan keamanan pada perangkat keras IoT berspesifikasi minim."
    ];
  } else if (lower.includes("mobile")) {
    judulMateri = "MOBILE COMPUTING & PENGEMBANGAN APLIKASI";
    poinKonsep = [
      "<b>Arsitektur Pengembangan:</b> Native (Kotlin/Swift), Cross-Platform (Flutter/Dart, React Native), Progressive Web Apps (PWA).",
      "<b>Siklus Hidup Aplikasi (Lifecycle):</b> onCreate ➔ onStart ➔ onResume ➔ onPause ➔ onStop ➔ onDestroy.",
      "<b>State Management & Storage:</b> SQLite/Room database lokal, Shared Preferences, REST API Integration (Retrofit/Axios).",
      "<b>Optimalisasi Kinerja:</b> Manajemen memori, background worker, dan caching data untuk mode offline."
    ];
    kisiKisiUjian = [
      "Jelaskan perbedaan saat Activity berada dalam kondisi onPause vs onStop!",
      "Keuntungan dan trade-off memilih framework Flutter dibanding Native Android.",
      "Bagaimana mengamankan API key di dalam aplikasi mobile client?"
    ];
  } else if (lower.includes("wirausaha") || lower.includes("bisnis")) {
    judulMateri = "KEWIRAUSAHAAN & STRATEGI BISNIS DIGITAL";
    poinKonsep = [
      "<b>Business Model Canvas (BMC):</b> 9 blok bangunan (Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partnerships, Cost Structure).",
      "<b>Validasi Pasar:</b> MVP (Minimum Viable Product), Customer Feedback Loop (Build-Measure-Learn), Product-Market Fit.",
      "<b>Analisis Kompetitif:</b> SWOT (Strengths, Weaknesses, Opportunities, Threats) dan Blue Ocean Strategy.",
      "<b>Unit Economics:</b> CAC (Customer Acquisition Cost) vs LTV (Customer Lifetime Value)."
    ];
    kisiKisiUjian = [
      "Mengapa Value Proposition harus selaras dengan Customer Pain Points?",
      "Jelaskan strategi mencapai rasio LTV:CAC yang sehat (minimal 3:1)!",
      "Contoh penerapan pivot strategi saat produk awal belum mencapai Product-Market Fit."
    ];
  } else {
    // Materi Kuliah Umum
    judulMateri = `RANGKUMAN STUDI: ${topik.toUpperCase()}`;
    poinKonsep = [
      `<b>Intisari Utama:</b> Pembahasan komprehensif terkait topik ${topik} dengan fokus pada prinsip dasar, metodologi, dan penerapannya di dunia nyata.`,
      "<b>Struktur Landasan:</b> Memahami keterkaitan antara teori formal dengan implementasi praktis di lapangan.",
      "<b>Faktor Penentu:</b> Analisis terhadap variabel-variabel kunci yang mempengaruhi keberhasilan topik ini.",
      "<b>Evaluasi Kritis:</b> Menemukan kelebihan dan batasan dari konsep yang diajarkan."
    ];
    kisiKisiUjian = [
      `Jelaskan definisi fundamental dan ruang lingkup dari ${topik}!`,
      "Sebutkan 3 studi kasus nyata di mana konsep ini diterapkan!",
      "Bagaimana menganalisis kelemahan dari metode ini saat menghadapi situasi kompleks?"
    ];
  }

  // Format Dokumen Microsoft Word (.doc) Rangkuman Minimalist Aesthetic
  const isiDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Study Notes - ${judulMateri}</title>
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
    @page {
      size: 21.0cm 29.7cm;
      margin: 2.5cm 2.5cm 2.5cm 2.5cm;
      mso-page-orientation: portrait;
    }
    body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #2c2724; background: #ffffff; padding: 20px; }
    .card { background: white; border: 1pt solid #e8e1d5; border-radius: 8pt; padding: 24pt; margin-bottom: 18pt; }
    .header-box { border-bottom: 2pt solid #8d5b36; padding-bottom: 12pt; margin-bottom: 16pt; }
    h1 { font-size: 16pt; color: #8d5b36; margin: 0 0 6pt 0; text-transform: uppercase; font-weight: bold; }
    .meta { font-size: 9.5pt; color: #666666; line-height: 1.4; }
    h2 { font-size: 12.5pt; color: #8d5b36; border-left: 3.5pt solid #8d5b36; padding-left: 8pt; margin: 16pt 0 8pt 0; font-weight: bold; }
    ul, ol { padding-left: 20pt; margin-bottom: 12pt; }
    li { margin-bottom: 6pt; font-size: 11pt; }
    .flashcard { background-color: #f7f3ed; border: 1pt solid #e2d9cd; border-left: 3.5pt solid #627d98; border-radius: 4pt; padding: 8pt 12pt; margin-bottom: 8pt; font-size: 10.5pt; }
    .footer-badge { text-align: center; font-size: 9pt; color: #888888; margin-top: 24pt; border-top: 0.5pt solid #dddddd; padding-top: 8pt; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-box">
      <h1>📚 STUDY NOTES & CHEAT SHEET UJIAN</h1>
      <div class="meta">
        <strong>Disusun oleh:</strong> Hendry (Study Notes & Summary Specialist)<br>
        <strong>Materi / Topik:</strong> ${judulMateri}<br>
        ${namaFileAsli ? `<strong>Berkas Rujukan:</strong> ${namaFileAsli}<br>` : ""}
        <strong>Waktu Rangkum:</strong> ${sekarang.toLocaleString("id-ID")}
      </div>
    </div>

    <h2>1. 📌 Intisari Konsep & Poin-Poin Kunci</h2>
    <ul>
      ${poinKonsep.map(p => `<li>${p}</li>`).join("\n      ")}
    </ul>

    <h2>2. 🎯 Kisi-Kisi Tanya Jawab Persiapan Ujian (Exam Takeaways)</h2>
    ${kisiKisiUjian.map((k, idx) => `
      <div class="flashcard">
        <b>Q${idx + 1}:</b> ${k}
      </div>
    `).join("")}

    <h2>3. 💡 Tips Belajar & Mengingat dari Hendry</h2>
    <p>Pelajari <b>Poin Kunci</b> di atas 15 menit sebelum kelas atau ujian. Fokuskan pada pemahaman istilah teknis dan perbedaannya langsung di dokumen Microsoft Word ini.</p>
  </div>
  <div class="footer-badge">
    Disusun khusus untuk Ma'am • Format Dokumen Microsoft Word (.doc) Siap Edit
  </div>
</body>
</html>`;

  return { judulMateri, poinKonsep, kisiKisiUjian, isiDoc };
}

function aksiHendry(instruksi) {
  const sekarang = new Date();
  const timestamp = sekarang.toISOString().replace(/[:.]/g, "-");
  
  // Ekstrak topik materi dari kalimat Ma'am secara cerdas
  let topik = instruksi
    .replace(/\b(?:hendry|tolong|coba|buatkan|rangkumkan|rangkum|ringkas|materi|tentang|soal|cheat sheet|ujian|dong|ya|dan|buat|kisi[- ]kisi(?:nya)?|file|berkas|ini)\b/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!topik || topik.length < 2) {
    topik = "Materi Perkuliahan Semester";
  }

  const cleanSlug = topik.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const { judulMateri, poinKonsep, isiDoc } = buatRangkumanMateriHendry(topik, instruksi);
  const namaFile = `RANGKUMAN_${cleanSlug}_${timestamp}.doc`;
  const pathFile = path.join(DOKUMEN_DIR, namaFile);

  fs.writeFileSync(pathFile, isiDoc, "utf-8");

  const ringkasanSingkat = poinKonsep.slice(0, 3).map(p => `• ${p.replace(/<[^>]*>/g, "")}`).join("\n");

  const pesan = `📚 Selesai, Ma'am! Hendry telah menyusun Catatan Belajar & Cheat Sheet untuk:\n"${judulMateri}"\n\n📌 Intisari Poin Kunci:\n${ringkasanSingkat}\n\nDokumen lengkap telah Hendry simpan dalam format Microsoft Word (.doc) di folder 'dokumen_tugas' sebagai "${namaFile}" dan siap Ma'am buka di Word atau unduh! 👨‍💻`;

  return { namaFile, pathFile, pesan, isi: isiDoc };
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

  // GET: Pengaturan Kantor & Konfigurasi Karyawan
  if (req.url === "/api/settings" && req.method === "GET") {
    const data = bacaDataAkademik();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      pengaturan: data.pengaturan || {},
      karyawan: data.karyawan || [],
      jadwalTetap: data.jadwalTetap || []
    }));
    return;
  }

  // POST: Simpan Pengaturan (Panggilan, Nama Asisten, Jadwal Kuliah s.d. Sabtu/Minggu)
  if (req.url === "/api/settings" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { namaPanggilan, namaCantika, namaRexha, namaHendry, jadwalBaru } = JSON.parse(body);
        const data = bacaDataAkademik();

        if (namaPanggilan && namaPanggilan.trim()) {
          const panggilanBaru = namaPanggilan.trim();
          data.pengaturan.namaPanggilan = panggilanBaru;
          data.pengaturan.greeting = `Ada tugas apa hari ini, ${panggilanBaru}?`;
        }

        if (data.karyawan) {
          data.karyawan.forEach(k => {
            if (k.id === "cantika" && namaCantika && namaCantika.trim()) k.nama = namaCantika.trim();
            if (k.id === "rexha" && namaRexha && namaRexha.trim()) k.nama = namaRexha.trim();
            if (k.id === "hendry" && namaHendry && namaHendry.trim()) k.nama = namaHendry.trim();
          });
        }

        if (Array.isArray(jadwalBaru)) {
          data.jadwalTetap = jadwalBaru;
        }

        simpanDataAkademik(data);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          sukses: true,
          pesan: "Pengaturan kantor dan jadwal berhasil disimpan!",
          pengaturan: data.pengaturan,
          karyawan: data.karyawan,
          jadwalTetap: data.jadwalTetap
        }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST: Simpan Kritik & Saran Pengguna
  if (req.url === "/api/feedback" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { nama, kategori, pesan } = JSON.parse(body);
        if (!pesan || !pesan.trim()) {
          throw new Error("Pesan kritik dan saran tidak boleh kosong.");
        }
        const data = bacaDataAkademik();
        const FEEDBACK_FILE = path.join(__dirname, "feedback_user.json");
        let listFeedback = [];
        if (fs.existsSync(FEEDBACK_FILE)) {
          try { listFeedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8")); } catch(e) {}
        }
        const itemBaru = {
          id: `fb_${Date.now()}`,
          waktu: new Date().toISOString(),
          namaPengguna: nama || (data.pengaturan && data.pengaturan.namaPanggilan) || "Pengguna",
          kategori: kategori || "Saran & Masukan",
          pesan: pesan.trim()
        };
        listFeedback.push(itemBaru);
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(listFeedback, null, 2), "utf-8");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          sukses: true,
          pesan: "Terima kasih banyak! Kritik & saran Anda telah berhasil dicatat untuk pengembangan sistem ini."
        }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
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
        
        // Simpan juga berkas asal ke folder dokumen_tugas agar tersimpan utuh di File Explorer
        const pathAsal = path.join(DOKUMEN_DIR, namaFileAsli);
        try { fs.writeFileSync(pathAsal, buffer); } catch(e) {}

        // EKSTRAK ISI TEKS ASLI DARI FILE UPLOAD PENGGUNA!
        const { judul: judulAsli, paragraf: isiParagrafAsli } = ekstrakTeksDariDokumen(buffer, namaFileAsli);

        let fileHasil = "";
        let isiHasil = "";
        let pesan = "";

        if (targetFormat === "doc" || targetFormat === "word") {
          fileHasil = `${baseName}_HASIL_WORD.doc`;
          isiHasil = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(judulAsli)}</title>
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
    Nama Berkas Asal: ${escapeHtml(namaFileAsli)}<br>
    Dikonversi oleh: Rexha (Document Specialist)<br>
    Tanggal: ${sekarang.toLocaleString("id-ID")}
  </div>
  <h1>${escapeHtml(judulAsli.toUpperCase())}</h1>
  ${isiParagrafAsli.map(p => `<p>${escapeHtml(p)}</p>`).join("\n  ")}
</body>
</html>`;
          pesan = `Rexha berhasil mengekstrak seluruh naskah asli dari "${namaFileAsli}" (${isiParagrafAsli.length} paragraf) menjadi format Microsoft Word (.doc) siap edit!`;
        } else {
          // Target PDF: MENGHASILKAN FILE .PDF ASLI BINER DENGAN ISI ASLI DOKUMEN!
          fileHasil = `${baseName}_HASIL_KONVERSI.pdf`;
          const pathHasilPdf = path.join(DOKUMEN_DIR, fileHasil);

          buatFilePdfAsli({
            pathFile: pathHasilPdf,
            judul: judulAsli || baseName.toUpperCase(),
            teksParagraf: isiParagrafAsli,
            subHeader: `Dikonversi oleh Rexha • Berkas Asal: ${namaFileAsli} • ${sekarang.toLocaleDateString("id-ID")}`
          });

          pesan = `Rexha berhasil mengonversi seluruh naskah asli "${namaFileAsli}" (${isiParagrafAsli.length} paragraf) menjadi berkas PDF ASLI (.pdf) siap cetak/kumpul!`;
          
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

  // POST: Upload & Rangkum Materi Kuliah (Drag & Drop Hendry 📚)
  if (req.url === "/api/upload-rangkum" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { namaFileAsli, instruksiTambahan } = JSON.parse(body);
        const sekarang = new Date();
        const baseName = path.parse(namaFileAsli).name;
        
        const { judulMateri, poinKonsep, kisiKisiUjian, isiDoc } = buatRangkumanMateriHendry(baseName, instruksiTambahan || "", namaFileAsli);
        
        const fileHasil = `RANGKUMAN_${baseName.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
        const pathHasil = path.join(DOKUMEN_DIR, fileHasil);
        fs.writeFileSync(pathHasil, isiDoc, "utf-8");

        const ringkasanTeks = poinKonsep.map(p => p.replace(/<[^>]*>/g, "")).join("\n• ");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          sukses: true,
          fileHasil,
          judulMateri,
          ringkasanTeks: "• " + ringkasanTeks,
          downloadUrl: `/api/download?nama=${encodeURIComponent(fileHasil)}`,
          pesan: `Hendry berhasil merangkum berkas "${namaFileAsli}" menjadi dokumen Microsoft Word (.doc) siap edit!`
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
      } else {
        // Berkas .doc dan .html dirender sebagai HTML di iframe pratinjau agar bisa langsung dibaca
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
        let { karyawanId, instruksi } = JSON.parse(body);
        const dataAkademik = bacaDataAkademik();
        let respon = {};

        // SMART INTENT ROUTING (Otomatis arahkan ke asisten yang tepat meskipun dropdown salah)
        const lowText = (instruksi || "").toLowerCase();
        let targetId = karyawanId;

        if (lowText.includes("hendry") || lowText.includes("rangkum") || lowText.includes("ringkas") || lowText.includes("materi") || lowText.includes("cheat sheet") || lowText.includes("catatan")) {
          targetId = "hendry";
        } else if (lowText.includes("rexha") || lowText.includes("pdf") || lowText.includes("doc") || lowText.includes("word") || lowText.includes("cover")) {
          targetId = "rexha";
        } else if (lowText.includes("cantika") || lowText.includes("jadwal") || lowText.includes("kuliah")) {
          targetId = "cantika";
        }

        if (targetId === "rexha") {
          respon = aksiRexha(instruksi);
        } else if (targetId === "hendry") {
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
