/**
 * Minimalist Pure Node.js Real PDF 1.4 Binary Generator
 * Menghasilkan file .pdf biner ASLI berstandar A4 tanpa dependensi pihak ketiga
 */

import fs from "node:fs";

export function buatFilePdfAsli({ pathFile, judul, teksParagraf = [] }) {
  // Ukuran A4 dalam points: 595.28 x 841.89 (lebar x tinggi)
  const marginKiri = 56.7; // ~2 cm
  const batasAtas = 780;
  
  // Format stream teks PDF
  let streamTeks = "BT\n";
  // Judul
  streamTeks += `/F2 16 Tf\n`;
  streamTeks += `${marginKiri} ${batasAtas} Td\n`;
  streamTeks += `(${escapePdfText(judul.toUpperCase())}) Tj\n`;
  
  // Garis pemisah atau spasi
  streamTeks += `/F1 11 Tf\n`;
  streamTeks += `0 -24 Td\n`;
  streamTeks += `(Dikonversi oleh Rexha - Document Specialist) Tj\n`;
  streamTeks += `0 -18 Td\n`;
  streamTeks += `(Waktu: ${new Date().toLocaleString("id-ID")}) Tj\n`;
  streamTeks += `0 -24 Td\n`;

  // Isi Paragraf
  for (const p of teksParagraf) {
    const lines = splitIntoLines(p, 75);
    for (let i = 0; i < lines.length; i++) {
      streamTeks += `(${escapePdfText(lines[i])}) Tj\n`;
      streamTeks += `0 -16 Td\n`;
    }
    streamTeks += `0 -10 Td\n`; // Spasi antar paragraf
  }
  streamTeks += "ET\n";

  const streamLength = Buffer.byteLength(streamTeks, "utf-8");

  // Struktur Objek PDF
  let pdf = "%PDF-1.4\n";
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += str + "\n";
  }

  // 1 0 obj: Catalog
  addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  // 2 0 obj: Pages
  addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);

  // 3 0 obj: Page
  addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj`);

  // 4 0 obj: Contents Stream
  addObj(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamTeks}endstream\nendobj`);

  // 5 0 obj: Font Regular (Times-Roman)
  addObj(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj`);

  // 6 0 obj: Font Bold (Times-Bold)
  addObj(`6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>\nendobj`);

  // Xref
  const startXref = Buffer.byteLength(pdf, "utf-8");
  pdf += "xref\n";
  pdf += `0 ${offsets.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  // Trailer
  pdf += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${startXref}\n%%EOF\n`;

  fs.writeFileSync(pathFile, Buffer.from(pdf, "utf-8"));
  return pathFile;
}

function escapePdfText(str) {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function splitIntoLines(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= maxChars) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}
