/**
 * VERSI PRODUKSI DENGAN REAL LLM (Google Gemini API - Function Calling)
 * 
 * Cara kerja asli di industri:
 * 1. Kita kirim daftar "Tools" (nama, deskripsi, parameter) ke API Gemini.
 * 2. Gemini membaca pertanyaan user dan otomatis memutuskan apakah butuh panggil tool (Function Call).
 * 3. Jika butuh, Gemini mengembalikan nama fungsi dan argumennya.
 * 4. Program kita mengeksekusi fungsi di komputer lokal, lalu mengirimkan hasilnya kembali ke Gemini.
 * 5. Gemini merangkum jawaban akhir secara natural.
 */

import readline from "node:readline";
import { tools } from "./tools.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Definisi Tools dalam format Function Calling Gemini
const geminiToolsDeclaration = [
  {
    functionDeclarations: [
      {
        name: "kalkulator",
        description: "Melakukan perhitungan matematika.",
        parameters: {
          type: "OBJECT",
          properties: {
            angka1: { type: "NUMBER", description: "Angka pertama" },
            operator: { type: "STRING", description: "Operator +, -, *, atau /" },
            angka2: { type: "NUMBER", description: "Angka kedua" }
          },
          required: ["angka1", "operator", "angka2"]
        }
      },
      {
        name: "cekCuaca",
        description: "Mengecek cuaca di kota tertentu.",
        parameters: {
          type: "OBJECT",
          properties: {
            kota: { type: "STRING", description: "Nama kota, misal: Jakarta, Bandung, Bali" }
          },
          required: ["kota"]
        }
      },
      {
        name: "ambilWaktuSekarang",
        description: "Mengambil waktu, tanggal, dan jam saat ini.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      }
    ]
  }
];

async function callGemini(contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      tools: geminiToolsDeclaration
    })
  });

  return await response.json();
}

async function tanyaGeminiAgent(pertanyaan) {
  if (!GEMINI_API_KEY) {
    console.log("❌ Error: GEMINI_API_KEY belum disetel!");
    console.log("Ketik di PowerShell: $env:GEMINI_API_KEY='kunci_api_kamu'");
    return;
  }

  console.log(`\n======================================================`);
  console.log(`👤 User: "${pertanyaan}"`);
  console.log(`======================================================`);

  const contents = [
    { role: "user", parts: [{ text: pertanyaan }] }
  ];

  console.log(`[🧠 1. THOUGHT] Mengirim pertanyaan & deskripsi tools ke LLM...`);
  const responseData = await callGemini(contents);

  const candidate = responseData.candidates?.[0]?.content?.parts?.[0];
  if (!candidate) {
    console.log("Respon kosong atau error:", JSON.stringify(responseData));
    return;
  }

  // Jika Gemini memutuskan memanggil tool
  if (candidate.functionCall) {
    const { name, args } = candidate.functionCall;
    console.log(`\n[⚡ 2. ACTION] Gemini memutuskan memanggil tool: ${name}`);
    console.log(`-> Argumen:`, args);

    // Eksekusi tool lokal
    let hasil = "Tool tidak ditemukan";
    if (tools[name]) {
      hasil = tools[name].eksekusi(args);
    }
    console.log(`\n[🔍 3. OBSERVATION] Hasil eksekusi tool lokal: "${hasil}"`);

    // Kirim balik hasil ke Gemini untuk dirangkum
    contents.push({ role: "model", parts: [{ functionCall: candidate.functionCall }] });
    contents.push({
      role: "function",
      parts: [{
        functionResponse: {
          name: name,
          response: { result: hasil }
        }
      }]
    });

    console.log(`\n[💬 4. FINAL ANSWER] Menghasilkan jawaban akhir...`);
    const finalResponse = await callGemini(contents);
    const finalAnswer = finalResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`Agen: "${finalAnswer?.trim()}"\n`);
  } else {
    // Gemini menjawab langsung tanpa tool
    console.log(`\n[💬 4. FINAL ANSWER] Tidak butuh tool:`);
    console.log(`Agen: "${candidate.text?.trim()}"\n`);
  }
}

async function main() {
  console.log("=== AI AGENT DENGAN REAL GEMINI API ===");
  if (!GEMINI_API_KEY) {
    console.log("\n⚠️ PERHATIAN: Kamu belum memasukkan GEMINI_API_KEY.");
    console.log("Dapatkan API Key gratis di: https://aistudio.google.com/");
    console.log("Lalu set di terminal: $env:GEMINI_API_KEY=\"AIzaSy...\"");
    console.log("Atau jalankan versi simulasi yang sudah siap pakai: node agent.js\n");
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("Ketik pertanyaan untuk agen: ", async (q) => {
    await tanyaGeminiAgent(q);
    rl.close();
  });
}

main();
