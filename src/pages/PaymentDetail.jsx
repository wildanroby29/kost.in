import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);

    let current = location.state;
    if (!current) {
      const savedOrders = JSON.parse(localStorage.getItem('orderHistory') || "[]");
      current = savedOrders.find(o => o.orderId === id);
    }

    if (current) {
      const deadline = new Date(current.deadline).getTime();
      const now = new Date().getTime();

      if (now > deadline && current.status.toUpperCase().includes("MENUNGGU")) {
        navigate('/'); 
        return;
      }

      setOrder(current);
      
      const timer = setInterval(() => {
        const diff = deadline - new Date().getTime();
        if (diff <= 0) {
          setTimeLeft("WAKTU HABIS");
          clearInterval(timer);
          navigate('/'); 
        } else {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${h}J : ${m}M : ${s}D`);
        }
      }, 1000);
      return () => clearInterval(timer);
    } else {
      navigate('/order');
    }
  }, [id, location.state, navigate]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-btn');
    if (btn) {
      btn.innerText = 'BERHASIL';
      setTimeout(() => { btn.innerText = 'SALIN'; }, 2000);
    }
  };

  const handleCSContact = () => {
    const message = `HALO ADMIN MU STORE, SAYA BUTUH BANTUAN UNTUK PESANAN #${order?.orderId?.split('-')[1] || id}. STATUS: ${order?.status}`;
    const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!order) return null;

  const statusStr = (order.status || "").toUpperCase();
  const isPaid = statusStr.includes('DIBAYAR') || statusStr.includes('SELESAI') || statusStr.includes('PAID');

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 antialiased uppercase font-black text-slate-900 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen border-x border-slate-50 relative shadow-2xl shadow-slate-100">
        
        {/* HEADER */}
        <motion.header
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-8 pt-14 pb-6 max-w-md mx-auto flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-xl z-50 border-b border-slate-50"
        >
          <div className="text-left">
            <p className="text-[10px] text-blue-600 tracking-[0.3em] leading-none mb-1">PEMBAYARAN</p>
            <h1 className="text-xl tracking-tighter font-black">DETAIL TRANSAKSI</h1>
          </div>
          <button onClick={() => navigate('/order')} className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-[18px] flex items-center justify-center active:scale-90 transition-all">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </motion.header>

        <main className="px-8 pt-8 space-y-6">
          {/* STATUS SECTION */}
          <section className="text-center py-12 bg-slate-50/50 rounded-[40px] border border-slate-50 shadow-inner relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-6 bg-white rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-center">
                <i className={`${isPaid ? 'ri-check-double-line text-green-500' : 'ri-time-line text-blue-600'} text-3xl ${!isPaid && 'animate-pulse'}`}></i>
              </div>
              
              <p className="text-[10px] text-slate-400 tracking-[0.2em] mb-2 font-bold">TOTAL TAGIHAN</p>
              <h2 className="text-4xl tracking-tighter font-black text-slate-900 mb-6 italic">
                RP {order.total?.toLocaleString() || '0'}
              </h2>
              
              <div className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] tracking-widest border mx-auto ${isPaid ? 'bg-green-500 text-white border-green-600' : 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-100'}`}>
                {statusStr}
              </div>

              {!isPaid && (
                <div className="mt-8">
                  <p className="text-[9px] text-slate-400 tracking-widest font-bold mb-1">BATAS WAKTU PEMBAYARAN</p>
                  <p className="text-sm font-black text-blue-600 tracking-widest">{timeLeft}</p>
                </div>
              )}
            </div>
          </section>

          {/* TRANSFER INSTRUCTION */}
          <section className="space-y-4">
            <h2 className="text-[10px] tracking-[0.3em] text-slate-400 px-2 font-black">INSTRUKSI TRANSFER</h2>
            <div className="p-7 border border-slate-100 rounded-[35px] bg-white shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100">
                  <i className={`${order.paymentMethod?.icon || 'ri-bank-card-line'} text-blue-600 text-2xl`}></i>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 mb-1 font-bold">METODE</p>
                  <p className="text-xs font-black tracking-tight uppercase">
                    {order.paymentMethod?.name || 'VIRTUAL ACCOUNT'}
                  </p>
                </div>
              </div>
              
              <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-slate-400 mb-2 font-bold">NOMOR REKENING / VA</p>
                  <p className="text-2xl font-black tracking-tighter text-slate-900">
                    {order.paymentMethod?.number || '88301234567890'}
                  </p>
                  <p className="text-[9px] text-blue-600 mt-2 font-black italic">A/N MEGA UTAMA GROUP</p>
                </div>
                <button 
                  id="copy-btn" 
                  onClick={() => handleCopy(order.paymentMethod?.number || '88301234567890')} 
                  className="bg-slate-900 text-white text-[10px] px-6 py-3 rounded-2xl font-black tracking-widest active:scale-90 transition-all shadow-lg"
                >
                  SALIN
                </button>
              </div>
            </div>
          </section>

          {/* ORDER INFO */}
          <section className="space-y-4">
            <h2 className="text-[10px] tracking-[0.3em] text-slate-400 px-2 font-black">INFO PESANAN</h2>
            <div className="p-7 border border-slate-100 rounded-[35px] bg-white space-y-4 shadow-sm">
              <div className="flex justify-between items-center text-[10px] font-black">
                <span className="text-slate-400 tracking-widest">ID PESANAN</span>
                <span className="text-slate-900">#{order.orderId?.split('-')[1] || id.slice(-8)}</span>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex justify-between text-[10px] font-black italic">
                  <span className="text-slate-400">SUBTOTAL</span>
                  <span>RP {order.subtotal?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black italic text-blue-600">
                  <span className="text-slate-400">ONGKIR</span>
                  <span>RP {order.baseOngkir?.toLocaleString() || '0'}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-[10px] font-black text-green-600 italic">
                    <span>PROMO VOUCHER</span>
                    <span>- RP {order.discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[11px] font-black tracking-[0.2em] text-slate-900">TOTAL AKHIR</span>
                <span className="text-xl font-black text-blue-600 italic">RP {order.total?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </section>

          {/* ACTIONS */}
          <div className="pt-6 pb-12 space-y-4">
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={() => navigate('/order')} 
              className="w-full py-6 rounded-[24px] bg-slate-900 text-white text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 transition-all"
            >
              <i className="ri-history-line text-lg"></i>
              CEK RIWAYAT PESANAN
            </motion.button>

            <button 
              onClick={handleCSContact}
              className="w-full py-6 rounded-[24px] bg-white border-2 border-slate-100 text-slate-900 text-[10px] font-black tracking-[0.3em] flex items-center justify-center gap-3 active:bg-slate-50 transition-all"
            >
              <i className="ri-customer-service-2-line text-lg text-blue-500"></i>
              BANTUAN LAYANAN
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}