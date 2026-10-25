import readline from "node:readline";
import { tools } from "./tools.js";

/**
 * APA ITU AGENT LOOP (ReAct Loop)?
 * 1. THOUGHT (Berpikir): Menganalisa pertanyaan user, apakah butuh alat/tools?
 * 2. ACTION (Aksi): Jika butuh, panggil tool yang sesuai dengan parameter yang tepat.
 * 3. OBSERVATION (Observasi): Ambil hasil dari tool tersebut.
 * 4. FINAL ANSWER (Jawaban): Rangkum jawaban akhir untuk user.
 */

// Simulasi logika reasoning (Otak Agen)
async function jalankanAgent(pertanyaanUser) {
  console.log(`\n======================================================`);
  console.log(`👤 User: "${pertanyaanUser}"`);
  console.log(`======================================================`);

  // STEP 1: THOUGHT (Berpikir)
  console.log(`\n[🧠 1. THOUGHT / BERPIKIR]`);
  
  const text = pertanyaanUser.toLowerCase();
  let toolTerpilih = null;
  let parameterTool = null;

  // Agen menganalisa input user untuk mencocokkan dengan tool yang tersedia
  if (text.includes("cuaca") || text.includes("hujan") || text.includes("suhu")) {
    let kota = "Jakarta";
    if (text.includes("bandung")) kota = "Bandung";
    else if (text.includes("surabaya")) kota = "Surabaya";
    else if (text.includes("bali")) kota = "Bali";

    toolTerpilih = tools.cekCuaca;
    parameterTool = { kota };
    console.log(`-> Saya menyadari user menanyakan informasi cuaca.`);
    console.log(`-> Dari daftar alat, saya harus menggunakan: "${toolTerpilih.nama}" untuk kota ${kota}.`);

  } else if (text.includes("+") || text.includes("-") || text.includes("*") || text.includes("/") || text.includes("kali") || text.includes("tambah") || text.includes("bagi") || text.includes("hitung")) {
    // Deteksi operasi matematika
    const match = text.match(/(\d+)\s*([\+\-\*\/]|kali|tambah|kurang|bagi)\s*(\d+)/);
    if (match) {
      let op = match[2];
      if (op === "kali") op = "*";
      if (op === "tambah") op = "+";
      if (op === "kurang") op = "-";
      if (op === "bagi") op = "/";
      
      toolTerpilih = tools.kalkulator;
      parameterTool = { angka1: match[1], operator: op, angka2: match[3] };
      console.log(`-> Saya menemukan ada pertanyaan perhitungan angka: ${match[1]} ${op} ${match[3]}.`);
      console.log(`-> Dari daftar alat, saya harus menggunakan: "${toolTerpilih.nama}".`);
    }

  } else if (text.includes("jam") || text.includes("waktu") || text.includes("tanggal") || text.includes("hari ini")) {
    toolTerpilih = tools.ambilWaktuSekarang;
    parameterTool = {};
    console.log(`-> User menanyakan tentang waktu/tanggal saat ini.`);
    console.log(`-> Dari daftar alat, saya harus menggunakan: "${toolTerpilih.nama}".`);
  }

  // STEP 2 & 3: ACTION & OBSERVATION (Jika butuh tool)
  let hasilObservasi = "";
  if (toolTerpilih) {
    console.log(`\n[⚡ 2. ACTION / AKSI NYATA]`);
    console.log(`-> Mengeksekusi function: ${toolTerpilih.nama}(${JSON.stringify(parameterTool)})`);
    
    // Eksekusi fungsi tool
    hasilObservasi = toolTerpilih.eksekusi(parameterTool);

    console.log(`\n[🔍 3. OBSERVATION / HASIL AKSI]`);
    console.log(`-> Data yang didapat dari sistem: "${hasilObservasi}"`);
  } else {
    console.log(`-> Pertanyaan ini bersifat umum/salam, tidak memerlukan alat (tools) eksternal.`);
  }

  // STEP 4: FINAL ANSWER
  console.log(`\n[💬 4. FINAL ANSWER / JAWABAN AKHIR]`);
  if (hasilObservasi) {
    console.log(`Agen: "Berdasarkan data yang saya periksa, ${hasilObservasi}."`);
  } else {
    console.log(`Agen: "Halo! Saya adalah AI Agent sederhana. Saya bisa membantu mengecek cuaca, menghitung matematika, atau memberi tahu waktu lokal saat ini!"`);
  }
  console.log(`------------------------------------------------------\n`);
}

// Menjalankan demo interaktif di terminal
async function main() {
  console.log(`\n🤖 SELAMAT DATANG DI SIMULATOR AI AGENT SEDERHANA!`);
  console.log(`Program ini menunjukkan cara kerja ReAct Loop (Thought -> Action -> Observation -> Answer)\n`);

  // Jalankan 3 contoh otomatis dulu agar langsung terlihat
  await jalankanAgent("Halo agen!");
  await jalankanAgent("Cuaca di Bandung hari ini gimana ya?");
  await jalankanAgent("Berapa hasil dari 250 * 4?");
  await jalankanAgent("Sekarang jam berapa?");

  console.log(`\n💡 SEKARANG GILIRAN KAMU MENCOBA!`);
  console.log(`Ketik pertanyaanmu (contoh: "cek cuaca di bali", "hitung 50 + 75", "jam berapa sekarang")`);
  console.log(`Ketik "keluar" untuk berhenti.\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const tanya = () => {
    rl.question("Ketik pertanyaan: ", async (input) => {
      if (input.trim().toLowerCase() === "keluar") {
        console.log("Sampai jumpa!");
        rl.close();
        return;
      }
      if (input.trim()) {
        await jalankanAgent(input.trim());
      }
      tanya();
    });
  };

  tanya();
}

// Jalankan program jika dieksekusi langsung
main();
