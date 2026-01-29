const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// PERTANGGUNGJAWABAN: Ambil dari Vercel (Live) atau pakai Key langsung (Local)
const WOO_URL = process.env.WOO_URL || 'https://megautamagroup.com';
const WOO_CK = process.env.WOO_CK || 'ck_1d3335c16b6b6f25bc030b41b681102f9feb055c';
const WOO_CS = process.env.WOO_CS || 'cs_31c05b76e1aeab5ca672f73026df0a2167381b1f';

app.all('*', async (req, res) => {
  try {
    const { id, search, page, per_page, on_sale } = req.query;
    
    // Membersihkan URL dari spasi dan slash di akhir
    const cleanUrl = WOO_URL.trim().replace(/\/$/, '');
    
    // Menentukan endpoint: satu produk atau daftar produk
    let finalUrl = id 
      ? `${cleanUrl}/wp-json/wc/v3/products/${id}` 
      : `${cleanUrl}/wp-json/wc/v3/products`;

    // Pastikan on_sale dikirim sebagai boolean true/false, bukan string "true"
    const isSaleOnly = on_sale === 'true' || on_sale === true;

    console.log(`Request ke: ${finalUrl} | Diskon: ${isSaleOnly}`);

    const response = await axios.get(finalUrl, {
      params: {
        consumer_key: WOO_CK,
        consumer_secret: WOO_CS,
        search: search || undefined,
        page: parseInt(page) || 1,
        per_page: parseInt(per_page) || 12,
        on_sale: isSaleOnly ? true : undefined,
        status: 'publish',
        _t: Date.now()
      },
      timeout: 15000 // Batas waktu 15 detik agar tidak timeout di Vercel
    });
    
    // Header anti-cache untuk memastikan data selalu fresh dari website
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json(response.data);

  } catch (error) {
    // Log error spesifik untuk mempermudah pengecekan
    if (error.code === 'ENOTFOUND') {
      console.error(`DNS Error: Domain ${WOO_URL} tidak ditemukan.`);
    } else if (error.response) {
      console.error(`WooCommerce Error [${error.response.status}]:`, error.response.data);
    } else {
      console.error("API Error:", error.message);
    }
    
    res.status(error.response ? error.response.status : 500).json({ 
      error: "Gagal mengambil data produk", 
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

module.exports = app;