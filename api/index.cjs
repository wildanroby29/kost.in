const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// PERTANGGUNGJAWABAN: Memasukkan Key langsung agar Localhost PASTI JALAN
const WOO_URL = 'https://megautamagroup.com';
const WOO_CK = 'ck_1d3335c16b6b6f25bc030b41b681102f9feb055c';
const WOO_CS = 'cs_31c05b76e1aeab5ca672f73026df0a2167381b1f';

app.all('*', async (req, res) => {
  try {
    const { id, search, page, per_page } = req.query;
    
    // Pastikan URL bersih
    const cleanUrl = WOO_URL.replace(/\/$/, '');
    let finalUrl = id 
      ? `${cleanUrl}/wp-json/wc/v3/products/${id}` 
      : `${cleanUrl}/wp-json/wc/v3/products`;

    const response = await axios.get(finalUrl, {
      params: {
        consumer_key: WOO_CK,
        consumer_secret: WOO_CS,
        search: search || '',
        page: page || 1,
        per_page: per_page || 10,
        _t: Date.now()
      },
      timeout: 15000 
    });

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Gagal memuat data produk",
      detail: error.message
    });
  }
});

module.exports = app;