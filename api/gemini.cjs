const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { message } = req.body;
    const OPENROUTER_KEY = "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";
    
    // DATA DARI WOOCOMMERCE KAKA
    const WOO_CK = "ck_1d3335c16b6b6f25bc030b41b681102f9feb055c";
    const WOO_CS = "cs_31c05b76e1aeab5ca672f73026df0a2167381b1f";
    let productsList = "";

    try {
      const wooRes = await axios.get('https://megautamagroup.com/wp-json/wc/v3/products', {
        params: { consumer_key: WOO_CK, consumer_secret: WOO_CS, per_page: 25 }
      });
      productsList = wooRes.data.map(p => `${p.name} (RP ${p.price})`).join(", ");
    } catch (e) {
      productsList = "DATA HARGA TERBARU DAPAT DITANYAKAN KE CS.";
    }

    // --- SYSTEM PROMPT PROFESIONAL & GLOBAL ---
    const systemInstruction = `
    KAMU ADALAH REPRÉSENTATIF RESMI DAN KONSULTAN TEKNIS DARI MEGA UTAMA GROUP.
    MEGA UTAMA GROUP ADALAH DISTRIBUTOR UTAMA CAT DAN MATERIAL KONSTRUKSI (JOTUN, KANSAI PAINT, DULUX, DLL).

    TUJUAN UTAMA:
    MEMBERIKAN INFORMASI PRODUK, ESTIMASI HARGA, DAN SOLUSI TEKNIS PENGECATAN/KONSTRUKSI SECARA AKURAT DAN PROFESIONAL KEPADA SELURUH PELANGGAN.

    PENGETAHUAN PERUSAHAAN:
    - CABANG: TUPAREV (PUSAT), INTERCHANGE, KOSAMBI, KLARI, CIBITUNG, CENGKONG.
    - LAYANAN: RETAIL CAT, SUPPLY PROYEK, EPOXY LANTAI, CAT LAPANGAN, PROTECTIVE COATING, DAN MATERIAL KONSTRUKSI.
    - KONTAK: WHATSAPP CS 0813-8888-8115.

    LOGIKA DAN ETIKA KOMUNIKASI:
    1. ANALISIS MASALAH: JIKA PELANGGAN MENGALAMI KERUSAKAN STRUKTUR (TEMBOK/ATAP HANCUR/BOLONG BESAR), JELASKAN BAHWA CAT HANYA UNTUK FINISHING. SARANKAN PERBAIKAN STRUKTUR DENGAN SEMEN/BATA DAHULU.
    2. DATA PRODUK: GUNAKAN LIST PRODUK INI SEBAGAI REFERENSI HARGA: ${productsList}. JIKA PRODUK TIDAK ADA DI LIST, SARANKAN HUBUNGI WA CS UNTUK CEK STOK GUDANG.
    3. TONALITAS: RAMAH, SOLUTIF, DAN SANGAT MENGERTI DETAIL TEKNIS. HINDARI JAWABAN YANG BERULANG-ULANG ATAU TIDAK MASUK AKAL.
    4. GLOBAL: JANGAN MENYEBUT NAMA SPESIFIK PENGGUNA KECUALI MEREKA MEMPERKENALKAN DIRI. GUNAKAN SAPAAN 'KAKA' UNTUK SEMUA ORANG.

    ATURAN FORMAT (WAJIB):
    - SEMUA JAWABAN HARUS MENGGUNAKAN HURUF BESAR (UPPERCASE).
    - DILARANG MENGGUNAKAN HURUF MIRING (ITALIC) ATAU FORMAT BOLD YANG BERLEBIHAN.
    - GUNAKAN BAHASA INDONESIA YANG BAIK, BENAR, DAN MUDAH DIMENGERTI.
    `;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "openai/gpt-4o-mini", 
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: message }
      ],
      temperature: 0.4,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return res.status(200).json({
      success: true,
      text: response.data.choices[0].message.content
    });

  } catch (error) {
    return res.status(500).json({ 
      error: true, 
      message: "MAAF KAKA, SISTEM KAMI SEDANG MENGALAMI GANGGUAN TEKNIS. SILAHKAN HUBUNGI WA CS 0813-8888-8115." 
    });
  }
};