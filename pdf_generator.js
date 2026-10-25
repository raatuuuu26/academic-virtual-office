/**
 * Minimalist Pure Node.js Real Multi-Page PDF 1.4 Binary Generator
 * Menghasilkan berkas .pdf biner ASLI standar A4 multi-halaman tanpa dependensi pihak ketiga
 */

import fs from "node:fs";

export function buatFilePdfAsli({ pathFile, judul, teksParagraf = [], subHeader = "" }) {
  const marginKiri = 56.7; // 2 cm (56.7 points)
  const marginAtas = 780;
  const marginBawah = 70;
  const tinggiBaris = 16;
  const maxKarakterPerBaris = 75;

  // Siapkan baris-baris dokumen
  const semuaBaris = [];

  // Header Dokumen di halaman 1
  semuaBaris.push({ teks: judul.toUpperCase(), tipe: "judul", spasiBawah: 18 });
  if (subHeader) {
    semuaBaris.push({ teks: subHeader, tipe: "meta", spasiBawah: 14 });
  }

  // Masukkan paragraf isi
  for (let pIdx = 0; pIdx < teksParagraf.length; pIdx++) {
    const rawP = (teksParagraf[pIdx] || "").trim();
    if (!rawP) continue;

    const wrappedLines = splitIntoLines(rawP, maxKarakterPerBaris);
    for (let lIdx = 0; lIdx < wrappedLines.length; lIdx++) {
      const isLastLineOfP = (lIdx === wrappedLines.length - 1);
      semuaBaris.push({
        teks: wrappedLines[lIdx],
        tipe: "isi",
        spasiBawah: isLastLineOfP ? 12 : tinggiBaris
      });
    }
  }

  // Pecah baris-baris menjadi halaman-halaman
  const halamanList = [];
  let currentHalamanLines = [];
  let currentY = marginAtas;

  for (const item of semuaBaris) {
    const itemHeight = item.tipe === "judul" ? 24 : item.spasiBawah;
    if (currentY - itemHeight < marginBawah && currentHalamanLines.length > 0) {
      // Halaman penuh, buat halaman baru
      halamanList.push(currentHalamanLines);
      currentHalamanLines = [];
      currentY = marginAtas;
    }

    currentHalamanLines.push(item);
    currentY -= itemHeight;
  }

  if (currentHalamanLines.length > 0 || halamanList.length === 0) {
    halamanList.push(currentHalamanLines);
  }

  const totalHalaman = halamanList.length;

  // Bangun stream teks untuk masing-masing halaman
  const pageStreams = halamanList.map((lines, pageIdx) => {
    let stream = "BT\n";
    let y = marginAtas;

    // Posisi awal cursor
    stream += `${marginKiri} ${marginAtas} Td\n`;

    for (let i = 0; i < lines.length; i++) {
      const item = lines[i];
      if (item.tipe === "judul") {
        stream += `/F2 15 Tf\n`;
      } else if (item.tipe === "meta") {
        stream += `/F1 9.5 Tf\n`;
      } else {
        stream += `/F1 11 Tf\n`;
      }

      stream += `(${escapePdfText(item.teks)}) Tj\n`;

      if (i < lines.length - 1) {
        const nextItem = lines[i + 1];
        const step = item.tipe === "judul" ? 22 : item.spasiBawah;
        stream += `0 -${step} Td\n`;
        y -= step;
      }
    }

    // Nomor halaman di footer
    stream += `ET\n`;
    stream += `BT\n`;
    stream += `/F1 9 Tf\n`;
    stream += `500 36 Td\n`;
    stream += `(${pageIdx + 1} / ${totalHalaman}) Tj\n`;
    stream += `ET\n`;

    return stream;
  });

  // Susun struktur objek PDF 1.4
  // 1: Catalog
  // 2: Pages (Kids)
  // Font 1 (Times-Roman): Obj 3
  // Font 2 (Times-Bold): Obj 4
  // Page Objs: 5, 7, 9...
  // Stream Objs: 6, 8, 10...

  let pdf = "%PDF-1.4\n";
  const offsets = [];

  function addObj(id, content) {
    offsets[id] = Buffer.byteLength(pdf, "utf-8");
    pdf += `${id} 0 obj\n${content}\nendobj\n`;
  }

  const FONT_REG = 3;
  const FONT_BOLD = 4;
  const pageObjIds = [];

  let nextObjId = 5;
  const pageStreamPairs = [];

  for (let i = 0; i < totalHalaman; i++) {
    const pageId = nextObjId++;
    const streamId = nextObjId++;
    pageObjIds.push(pageId);
    pageStreamPairs.push({ pageId, streamId, stream: pageStreams[i] });
  }

  // Obj 1: Catalog
  addObj(1, `<< /Type /Catalog /Pages 2 0 R >>`);

  // Obj 2: Pages
  const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(" ");
  addObj(2, `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalHalaman} >>`);

  // Obj 3: Font Regular
  addObj(FONT_REG, `<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>`);

  // Obj 4: Font Bold
  addObj(FONT_BOLD, `<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>`);

  // Render Page & Stream Objs
  for (const pair of pageStreamPairs) {
    const streamLen = Buffer.byteLength(pair.stream, "utf-8");
    addObj(pair.pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ${pair.streamId} 0 R /Resources << /Font << /F1 ${FONT_REG} 0 R /F2 ${FONT_BOLD} 0 R >> >> >>`);
    addObj(pair.streamId, `<< /Length ${streamLen} >>\nstream\n${pair.stream}endstream`);
  }

  // Xref
  const startXref = Buffer.byteLength(pdf, "utf-8");
  const totalObjs = nextObjId - 1;
  pdf += "xref\n";
  pdf += `0 ${totalObjs + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= totalObjs; i++) {
    const off = offsets[i] || 0;
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  // Trailer
  pdf += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${startXref}\n%%EOF\n`;

  fs.writeFileSync(pathFile, Buffer.from(pdf, "utf-8"));
  return pathFile;
}

function escapePdfText(str) {
  // Hanya simpan karakter printable ASCII untuk standar PDF Type1
  return str
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function splitIntoLines(text, maxChars) {
  if (!text) return [];
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
