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
