import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Mencegah perulangan (Infinite Loop)
  const hasProcessed = useRef(false);
  
  const externalId = searchParams.get('orderId') || searchParams.get('external_id') || searchParams.get('id');

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const finalizeOrder = async () => {
      if (!externalId || hasProcessed.current) {
        setLoading(false);
        return;
      }

      try {
        hasProcessed.current = true; // Kunci: Hanya jalan 1 kali

        // 1. Ambil data pesanan (Poin sudah diupdate oleh Webhook di server)
        const q = query(collection(db, "orders"), where("orderId", "==", externalId));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const orderData = snap.docs[0].data();
          setOrder(orderData);

          // 2. Bersihkan local storage secukupnya
          localStorage.removeItem('checkout_items');
          // Jika Bos punya user_points di local storage, hapus agar dia fetch ulang dari DB di halaman profil
          localStorage.removeItem('user_points');
        }
      } catch (err) {
        console.error("Gagal memproses data pesanan:", err);
      } finally {
        setLoading(false);
      }
    };

    finalizeOrder();
  }, [externalId]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "HARI INI";
    try {
      const d = dateValue.seconds ? new Date(dateValue.seconds * 1000) : new Date(dateValue);
      return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).toUpperCase();
    } catch (e) {
      return "HARI INI";
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white tracking-[0.3em]">
        MENYIAPKAN TRANSAKSI...
      </div>
    );
  }

  const subtotalProduk = order?.items?.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0) || 0;
  const ongkirAsli = order?.courier?.price || 0;
  const potonganPoin = order?.pointsUsed || 0;
  const totalAkhir = order?.total || 0;

  return (
    <div className="fixed inset-0 bg-blue-600 flex flex-col font-sans antialiased text-slate-800 overflow-y-auto pb-10 uppercase font-black">
      
      <div className="pt-8 pb-4 px-10 flex justify-between items-center text-white shrink-0">
        <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full">
          <i className="ri-arrow-left-s-line text-xl"></i>
        </button>
        <span className="text-[10px] tracking-[0.2em] text-blue-100">DETAIL TRANSAKSI</span>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 px-10 flex flex-col justify-center py-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[35px] overflow-hidden shadow-2xl relative">
          
          <div className="absolute top-[160px] -left-3 w-6 h-6 bg-blue-600 rounded-full z-10"></div>
          <div className="absolute top-[160px] -right-3 w-6 h-6 bg-blue-600 rounded-full z-10"></div>

          <div className="p-6">
            <div className="flex flex-col items-center mb-6 pt-2 text-center">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg mb-3">
                <i className="ri-check-line text-2xl"></i>
              </div>
              <h1 className="text-base tracking-tight">PEMBAYARAN BERHASIL</h1>
              <p className="text-[8px] text-slate-400 mt-0.5 tracking-widest break-all px-4">
                ID: {order?.orderId || externalId || '---'}
              </p>
            </div>

            <div className="border-t border-dashed border-slate-200 my-5"></div>

            <div className="space-y-3.5 px-1">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400">WAKTU</span>
                <span className="text-slate-700">{formatDate(order?.createdAt)}</span>
              </div>

              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400">KURIR</span>
                <span className="text-slate-700">{order?.courier?.courier_name || 'DIAMBIL'}</span>
              </div>

              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400">STATUS</span>
                <span className="text-[8px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">PAID SUCCESS</span>
              </div>

              <div className="pt-3 space-y-2 border-t border-slate-50 mt-2">
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">SUBTOTAL</span>
                  <span className="text-slate-700">RP {subtotalProduk.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-400">ONGKIR</span>
                  <span className="text-slate-700">RP {ongkirAsli.toLocaleString()}</span>
                </div>
                
                {potonganPoin > 0 && (
                  <div className="flex justify-between text-[9px] text-red-500">
                    <span>PAKAI POIN</span>
                    <span>- RP {potonganPoin.toLocaleString()}</span>
                  </div>
                )}

                <div className="mt-2 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 border-dashed flex justify-between items-center">
                  <span className="text-[8px] text-blue-600">POIN DIDAPAT</span>
                  <span className="text-[9px] text-blue-600">+ {order?.pointsEarned?.toLocaleString() || '0'} POIN</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100/50">
            <div>
              <p className="text-[8px] text-slate-400 tracking-widest mb-0.5">TOTAL BAYAR</p>
              <p className="text-lg text-blue-600 tracking-tight">
                RP {totalAkhir.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[7px] text-slate-400">METODE</p>
              <p className="text-[9px] text-slate-700">XENDIT</p>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 flex gap-3 px-1 shrink-0">
          <button onClick={() => navigate('/order')} className="flex-1 py-3.5 bg-blue-700/40 border border-white/10 text-white rounded-2xl text-[9px] tracking-widest active:scale-95 transition-all">
            RIWAYAT
          </button>
          <button onClick={() => navigate('/')} className="flex-1 py-3.5 bg-white text-blue-600 rounded-2xl text-[9px] tracking-widest shadow-xl active:scale-95 transition-all">
            SELESAI
          </button>
        </div>
      </div>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
    </div>
  );
}