const axios = require('axios');

module.exports = async (req, res) => {
  // 1. CORS SETTINGS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { orderId, totalBill, customerEmail } = req.body;

    // VALIDASI INPUT
    if (!orderId || !totalBill) {
      return res.status(400).json({ 
        error: true, 
        message: "ORDER ID DAN TOTAL BILL WAJIB ADA BOS!" 
      });
    }

    // 2. URL DINAMIS (Localhost / Production)
    const base_url = req.headers.origin || "https://web-app-megautama.vercel.app";

    const xenditPayload = {
      external_id: String(orderId),
      amount: Math.round(Number(totalBill)), // Pastikan bulat
      payer_email: customerEmail || "guest@megautama.com",
      description: `PEMBAYARAN MEGA UTAMA - ORDER #${orderId}`,
      currency: "IDR",
      reminder_time: 1, // Pengingat dalam 1 jam
      success_redirect_url: `${base_url}/success?orderId=${orderId}`, 
      failure_redirect_url: `${base_url}/order`
    };

    // 3. GUNAKAN ENV VARIABLE (Ganti key ini di dashboard Vercel/Firebase Kaka)
    // Jangan di-hardcode lagi ya Bos!
    const XENDIT_SECRET = process.env.XENDIT_SECRET_KEY || 'xnd_development_Ad2J5JPL...';

    const response = await axios.post('https://api.xendit.co/v2/invoices', xenditPayload, {
      auth: {
        username: XENDIT_SECRET,
        password: ''
      }
    });

    // KIRIM RESPON KE FRONTEND
    return res.status(200).json(response.data);

  } catch (error) {
    console.error("XENDIT API ERROR:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({ 
      error: true, 
      message: error.response?.data?.message || "SERVER SEDANG BERMASALAH" 
    });
  }
};