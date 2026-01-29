const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { 
      origin_latitude, 
      origin_longitude, 
      destination_latitude, 
      destination_longitude, 
      items 
    } = req.body;

    if (!origin_latitude || !destination_latitude) {
      return res.status(400).json({ error: true, message: "Koordinat tidak lengkap" });
    }

    // --- LOGIKA AMBIL TOKEN (Trik Anti-Gagal) ---
    // Dia akan coba ambil dari Vercel, kalau kosong baru pakai backup string ini
    const BITESHIP_TOKEN = process.env.BITESHIP_API_KEY || 'biteship_live.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoibWVnYSBhcHAiLCJ1c2VySWQiOiI2OGQ3NzdjZDU2MDQzNzAwMTIwY2YwNjciLCJpYXQiOjE3Njg4Nzg1NzR9.Erk2zjO9tNDyATLG8dW8PAWh4fS2DT-L_a5XQkP-c4I';

    const biteshipPayload = {
      origin_latitude: Number(origin_latitude),
      origin_longitude: Number(origin_longitude),
      destination_latitude: Number(destination_latitude),
      destination_longitude: Number(destination_longitude),
      couriers: "grab,gojek,jne,sicepat,anteraja",
      items: items.map(item => ({
        name: item.name || "Produk",
        description: item.name || "-",
        value: Math.round(Number(item.value || 0)),
        weight: Math.round(Number(item.weight || 1000)),
        quantity: Math.round(Number(item.quantity || 1))
      }))
    };

    const response = await axios.post('https://api.biteship.com/v1/rates/couriers', biteshipPayload, {
      headers: { 
        'Authorization': BITESHIP_TOKEN, // Variabel dinamis
        'Content-Type': 'application/json'
      }
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Detail Error Biteship:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({ 
      error: true, 
      message: error.response?.data?.message || error.message 
    });
  }
};