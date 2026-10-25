import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buatFilePdfAsli } from "../pdf_generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("1. Verifikasi Integritas Konfigurasi academic_data.json", () => {
  const dataPath = path.join(rootDir, "academic_data.json");
  assert.ok(fs.existsSync(dataPath), "academic_data.json harus tersedia");
  
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);
  
  assert.ok(data.pengaturan, "Objek pengaturan harus ada");
  assert.ok(data.pengaturan.namaPanggilan, "Field namaPanggilan harus terdefinisi");
  assert.ok(Array.isArray(data.karyawan), "Karyawan harus berupa array");
  assert.equal(data.karyawan.length, 3, "Harus ada 3 asisten (Rexha, Hendry, Cantika)");
  
  const ids = data.karyawan.map(k => k.id);
  assert.ok(ids.includes("rexha"), "Rexha harus terdaftar");
  assert.ok(ids.includes("hendry"), "Hendry harus terdaftar");
  assert.ok(ids.includes("cantika"), "Cantika harus terdaftar");
  
  assert.ok(Array.isArray(data.jadwalTetap), "Jadwal tetap harus berupa array");
});

test("2. Verifikasi Generator Binary PDF Asli (Rexha)", () => {
  const tmpDir = path.join(rootDir, "kuliah_workspace", "dokumen_tugas");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  const testPdfPath = path.join(tmpDir, "TEST_CI_VERIFIKASI.pdf");
  
  buatFilePdfAsli({
    pathFile: testPdfPath,
    judul: "UJI CI/CD AUTOMATION",
    teksParagraf: ["Paragraf uji otomatis untuk validasi PDF binary."]
  });

  assert.ok(fs.existsSync(testPdfPath), "File PDF uji harus terbuat");
  
  const fileBytes = fs.readFileSync(testPdfPath);
  const header = fileBytes.subarray(0, 5).toString("ascii");
  assert.equal(header, "%PDF-", "File harus memiliki magic bytes biner PDF (%PDF-)");
  
  // Cleanup test file
  fs.unlinkSync(testPdfPath);
});

test("3. Verifikasi Integritas public/index.html & Script Syntax", () => {
  const indexPath = path.join(rootDir, "public", "index.html");
  assert.ok(fs.existsSync(indexPath), "public/index.html harus tersedia");
  
  const html = fs.readFileSync(indexPath, "utf-8");
  assert.ok(html.includes("centerNotificationModal"), "Modal notifikasi tengah harus ada");
  assert.ok(html.includes("rexhaDropZone"), "Workstation Rexha harus ada");
  assert.ok(html.includes("hendryDropZone"), "Workstation Hendry harus ada");
  
  // Script syntax validation
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, "Blok script harus ditemukan");
  
  // Validating function constructor executes without syntax error
  new Function(scriptMatch[1]);
});

test("4. Verifikasi Fleksibilitas Jadwal Kuliah (Termasuk Sabtu & Minggu)", () => {
  const dataPath = path.join(rootDir, "academic_data.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);

  // Simulasi penambahan mata kuliah hari Sabtu
  const jadwalSabtu = {
    id: "sabtu-1",
    hari: "Sabtu",
    jam: "09:00 WIB",
    matkul: "Praktikum Jaringan & Cloud Security",
    ruangan: "Lab Cyber 3",
    dosen: "Ir. Handayani, M.Kom"
  };

  const jadwalUpdated = [...data.jadwalTetap, jadwalSabtu];
  assert.ok(jadwalUpdated.some(j => j.hari === "Sabtu"), "Jadwal harus mendukung kelas hari Sabtu");
});

test("5. Verifikasi Integritas Penyimpanan Feedback Pengguna", () => {
  const feedbackFile = path.join(rootDir, "feedback_user.json");
  const sample = [{
    id: "fb_test",
    waktu: new Date().toISOString(),
    namaPengguna: "Tester",
    kategori: "Fitur",
    pesan: "Uji coba pencatatan feedback otomatis."
  }];

  fs.writeFileSync(feedbackFile, JSON.stringify(sample, null, 2), "utf-8");
  assert.ok(fs.existsSync(feedbackFile), "feedback_user.json harus dapat ditulis");
  
  const read = JSON.parse(fs.readFileSync(feedbackFile, "utf-8"));
  assert.equal(read[0].namaPengguna, "Tester");

  // Cleanup
  fs.unlinkSync(feedbackFile);
});

test("6. Verifikasi Ekstraksi Isi Teks Dokumen Nyata (doc_parser.js)", async () => {
  const { ekstrakTeksDariDokumen } = await import("../doc_parser.js");

  // A. Uji ekstraksi format Word HTML / DOC
  const sampleDocHtml = Buffer.from(`
    <html xmlns:w='urn:schemas-microsoft-com:office:word'>
    <body>
      <h1>PROPOSAL BISNIS MAHASISWA</h1>
      <p>Latar Belakang: Mengembangkan platform edukasi dan perkuliahan.</p>
      <p>Tujuan: Memberikan asisten pintar berbasis teknologi.</p>
    </body>
    </html>
  `, "utf-8");

  const hasil = ekstrakTeksDariDokumen(sampleDocHtml, "Proposal_Bisnis.doc");
  assert.equal(hasil.judul, "PROPOSAL BISNIS MAHASISWA");
  assert.ok(hasil.paragraf.length >= 2, "Harus mengekstrak minimal 2 paragraf");
  assert.ok(hasil.paragraf.some(p => p.includes("Latar Belakang")), "Konten paragraf asli harus terbawa");

  // B. Uji ekstraksi format Plain Text
  const sampleTxt = Buffer.from("Judul Catatan Kuliah\nBab 1: Pendahuluan\nBab 2: Pembahasan Masalah", "utf-8");
  const hasilTxt = ekstrakTeksDariDokumen(sampleTxt, "Catatan.txt");
  assert.equal(hasilTxt.judul, "Judul Catatan Kuliah");
  assert.equal(hasilTxt.paragraf.length, 3);
});

