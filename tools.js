/**
 * TOOLS (Alat / Tangan & Kaki AI Agent)
 * 
 * AI (LLM) pada dasarnya hanya bisa memproses teks. 
 * Agar AI bisa beraksi di dunia nyata, kita memberikannya "Tools".
 * Setiap tool memiliki:
 * 1. nama
 * 2. deskripsi (agar AI tahu KAPAN harus memakainya)
 * 3. fungsi eksekusi (kode javascript yang berjalan)
 */

export const tools = {
  kalkulator: {
    nama: "kalkulator",
    deskripsi: "Gunakan alat ini jika ada operasi matematika atau perhitungan angka.",
    eksekusi: ({ angka1, operator, angka2 }) => {
      const a = Number(angka1);
      const b = Number(angka2);
      let hasil;
      switch (operator) {
        case "+": hasil = a + b; break;
        case "-": hasil = a - b; break;
        case "*": hasil = a * b; break;
        case "/": hasil = b !== 0 ? a / b : "Error: Pembagian dengan nol"; break;
        default: hasil = "Operator tidak dikenali";
      }
      return `Hasil hitung: ${hasil}`;
    }
  },

  cekCuaca: {
    nama: "cekCuaca",
    deskripsi: "Gunakan alat ini untuk mencari tahu informasi cuaca di kota tertentu.",
    eksekusi: ({ kota }) => {
      // Simulasi database cuaca
      const dataCuaca = {
        jakarta: "Cerah berawan, suhu 32°C, kelembapan 75%",
        bandung: "Hujan ringan, suhu 22°C, sejuk",
        surabaya: "Terik panas, suhu 34°C",
        bali: "Cerah, suhu 29°C, cocok untuk pantai"
      };
      const kunci = kota.toLowerCase();
      if (dataCuaca[kunci]) {
        return `Kondisi cuaca di ${kota}: ${dataCuaca[kunci]}`;
      }
      return `Cuaca di ${kota}: Sebagian berawan, suhu sekitar 28°C`;
    }
  },

  ambilWaktuSekarang: {
    nama: "ambilWaktuSekarang",
    deskripsi: "Gunakan alat ini untuk mengetahui jam, tanggal, hari, dan tahun saat ini.",
    eksekusi: () => {
      const sekarang = new Date();
      return `Waktu lokal saat ini: ${sekarang.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`;
    }
  }
};
