import zlib from "node:zlib";
import path from "node:path";

/**
 * Ekstraktor teks komprehensif untuk .docx, .doc, .html, .txt, dan .pdf
 * Berjalan murni di Node.js standar tanpa dependensi eksternal
 */

export function ekstrakTeksDariDokumen(buffer, namaFile = "") {
  if (!buffer || buffer.length === 0) {
    return {
      judul: path.parse(namaFile).name || "Dokumen Tugas",
      paragraf: ["(Dokumen kosong)"]
    };
  }

  const baseName = path.parse(namaFile).name || "Dokumen Tugas";

  // 1. FORMAT DOCX (Zip archive PK\x03\x04)
  if (buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    try {
      const paragrafDocx = parseDocxBuffer(buffer);
      if (paragrafDocx.length > 0) {
        const judul = paragrafDocx[0].slice(0, 80);
        return {
          judul: judul.length > 3 ? judul : baseName,
          paragraf: paragrafDocx
        };
      }
    } catch (err) {
      console.warn("Gagal parse DOCX via PK headers, mencoba fallback teks:", err.message);
    }
  }

  // 2. FORMAT HTML / DOC BERBASIS XML/HTML
  const textStr = buffer.toString("utf-8");
  if (textStr.includes("<html") || textStr.includes("<w:WordDocument") || textStr.includes("<body") || textStr.includes("<p>")) {
    const paragrafHtml = parseHtmlText(textStr);
    if (paragrafHtml.length > 0) {
      return {
        judul: paragrafHtml[0].slice(0, 80) || baseName,
        paragraf: paragrafHtml
      };
    }
  }

  // 3. FORMAT PDF (Magic bytes %PDF-)
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    const paragrafPdf = parsePdfText(buffer);
    if (paragrafPdf.length > 0) {
      return {
        judul: paragrafPdf[0].slice(0, 80) || baseName,
        paragraf: paragrafPdf
      };
    }
  }

  // 4. FORMAT PLAIN TEXT / FALLBACK
  const lines = textStr
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("<?xml") && !l.startsWith("<!DOCTYPE"));

  if (lines.length > 0) {
    return {
      judul: lines[0].slice(0, 80) || baseName,
      paragraf: lines
    };
  }

  // Fallback ekstraksi karakter string yang terbaca dari binary
  const binaryStrings = extractPrintableStrings(buffer);
  return {
    judul: baseName,
    paragraf: binaryStrings.length > 0 ? binaryStrings : ["Isi dokumen tugas berhasil diproses."]
  };
}

/**
 * Parse DOCX dengan mengekstrak 'word/document.xml' dari zip buffer
 */
function parseDocxBuffer(buffer) {
  let documentXml = null;

  // Cek local headers
  let offset = 0;
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compression = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const fileName = buffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
      const dataStart = offset + 30 + fileNameLen + extraLen;

      if (fileName === "word/document.xml") {
        const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
        if (compression === 8) {
          documentXml = zlib.inflateRawSync(compressedData).toString("utf8");
        } else if (compression === 0) {
          documentXml = compressedData.toString("utf8");
        }
        break;
      }
      offset = (compressedSize > 0) ? (dataStart + compressedSize) : (offset + 4);
    } else {
      offset++;
    }
  }

  // Jika belum ketemu (misal data descriptor digunakan), cek Central Directory
  if (!documentXml) {
    let cdOffset = 0;
    while (cdOffset < buffer.length - 46) {
      if (buffer.readUInt32LE(cdOffset) === 0x02014b50) {
        const compression = buffer.readUInt16LE(cdOffset + 10);
        const compressedSize = buffer.readUInt32LE(cdOffset + 20);
        const fileNameLen = buffer.readUInt16LE(cdOffset + 28);
        const extraLen = buffer.readUInt16LE(cdOffset + 30);
        const commentLen = buffer.readUInt16LE(cdOffset + 32);
        const localHeaderOffset = buffer.readUInt32LE(cdOffset + 42);
        const fileName = buffer.toString("utf8", cdOffset + 46, cdOffset + 46 + fileNameLen);

        if (fileName === "word/document.xml") {
          const lhFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
          const lhExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
          const dataStart = localHeaderOffset + 30 + lhFileNameLen + lhExtraLen;
          const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
          if (compression === 8) {
            documentXml = zlib.inflateRawSync(compressedData).toString("utf8");
          } else {
            documentXml = compressedData.toString("utf8");
          }
          break;
        }
        cdOffset += 46 + fileNameLen + extraLen + commentLen;
      } else {
        cdOffset++;
      }
    }
  }

  if (!documentXml) return [];

  // Parse <w:p> paragraf dan <w:t> teks
  const paragraphs = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(documentXml)) !== null) {
    const pContent = pMatch[1];
    const tRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    let pText = "";
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      pText += tMatch[1];
    }
    pText = pText.trim();
    if (pText.length > 0) {
      paragraphs.push(pText);
    }
  }

  return paragraphs;
}

/**
 * Ekstraksi paragraf dari format HTML / Word HTML
 */
function parseHtmlText(htmlStr) {
  // Hapus script dan style
  const cleanHtml = htmlStr
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const paragraphs = [];
  // Ekstrak blok konten
  const blockRegex = /<(?:p|h[1-6]|li|div)\b[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|li|div)>/gi;
  let match;
  while ((match = blockRegex.exec(cleanHtml)) !== null) {
    let text = match[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 0 && !paragraphs.includes(text)) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

/**
 * Ekstraksi teks dari PDF sederhana (mencari blok Tj dan teks stream)
 */
function parsePdfText(buffer) {
  const text = buffer.toString("binary");
  const paragraphs = [];
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  let currentP = "";

  while ((match = tjRegex.exec(text)) !== null) {
    const rawWord = match[1].replace(/\\([()\\])/g, "$1").trim();
    if (rawWord.length > 0) {
      currentP += (currentP ? " " : "") + rawWord;
      if (rawWord.endsWith(".") || rawWord.endsWith("!") || rawWord.endsWith("?") || currentP.length > 100) {
        paragraphs.push(currentP);
        currentP = "";
      }
    }
  }
  if (currentP.length > 0) {
    paragraphs.push(currentP);
  }

  return paragraphs;
}

/**
 * Fallback jika berkas adalah binary lama: mengekstrak untaian karakter ASCII/UTF8 terbaca
 */
function extractPrintableStrings(buffer) {
  const result = [];
  let current = "";
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    // Printable ASCII 32 - 126
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= 12 && !current.includes("xml") && !current.includes("xmlns")) {
        result.push(current.trim());
      }
      current = "";
    }
  }
  return result.slice(0, 30);
}
