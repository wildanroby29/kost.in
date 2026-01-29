import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../firebase'; 
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

export default function Order() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('Semua');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const loadData = async () => {
    setIsRefreshing(true);
    const currentUser = auth.currentUser;
    const userEmail = (currentUser?.email || JSON.parse(localStorage.getItem('user'))?.email || "").toLowerCase().trim();

    if (!userEmail) {
      setOrders([]);
      setIsRefreshing(false);
      return;
    }

    try {
      const q = query(
        collection(db, "orders"), 
        where("userEmail", "==", userEmail), 
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedOrders = querySnapshot.docs.map(docSnapshot => ({
        ...docSnapshot.data(),
        id: docSnapshot.id,
        status: (docSnapshot.data().status || "PENDING").toUpperCase()
      }));
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("FIREBASE ERROR:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => loadData());
    return () => unsub();
  }, []);

  const handleDeleteOrder = async (e, orderId, status) => {
    e.stopPropagation();
    const s = status.toUpperCase();
    const isDeletable = s.includes('PENDING') || s.includes('MENUNGGU') || s.includes('EXPIRED');

    if (!isDeletable) return;

    if (window.confirm("HAPUS RIWAYAT PESANAN?")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
        setOrders(orders.filter(order => order.id !== orderId));
      } catch (err) {
        console.error("GAGAL HAPUS:", err);
      }
    }
  };

  const tabs = ['Semua', 'Menunggu', 'Proses', 'Selesai'];

  const filteredOrders = orders.filter(order => {
    const s = order.status;
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Menunggu') return s.includes('PENDING') || s.includes('MENUNGGU') || s.includes('EXPIRED');
    if (activeTab === 'Proses') return s === 'PAID' || s === 'SETTLED' || s === 'DIPROSES' || s === 'DIKIRIM';
    if (activeTab === 'Selesai') return s === 'SELESAI' || s === 'COMPLETED' || s === 'BERHASIL';
    return false;
  });

  return (
    <div className="min-h-screen bg-[#FDFDFD] antialiased text-slate-900 flex justify-center font-sans uppercase">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      <div className="w-full max-w-md bg-white min-h-screen relative flex flex-col border-x border-slate-50 shadow-sm">
        
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-6 pt-12 pb-2 border-b border-slate-50 text-left">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[7px] text-blue-600 font-bold tracking-[0.2em] mb-0.5 uppercase">TRANSAKSI</p>
              <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">RIWAYAT PESANAN</h1>
            </div>
            <button onClick={loadData} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 active:scale-90 transition-all">
              <i className={`ri-refresh-line text-lg ${isRefreshing ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
          
          <div className="flex gap-8 overflow-x-auto no-scrollbar px-1">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-[9px] relative tracking-[0.15em] font-black transition-all ${activeTab === tab ? 'text-blue-600' : 'text-slate-300'}`}>
                {tab}
                {activeTab === tab && <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-6 space-y-4 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const s = order.status;
                const isDeletable = s.includes('PENDING') || s.includes('MENUNGGU') || s.includes('EXPIRED');
                
                return (
                  <motion.div layout key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white border rounded-2xl p-4 transition-all duration-300 ${expandedOrder === order.id ? 'border-blue-100 shadow-xl shadow-blue-50/50' : 'border-slate-50 shadow-sm'}`}
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex justify-between items-start mb-4 text-left">
                      <div>
                        <p className="text-[9px] font-black text-slate-900 tracking-tight uppercase">#INV-{order.id?.slice(-8).toUpperCase()}</p>
                        <p className="text-[7px] text-slate-300 font-bold mt-0.5">
                          {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'BARU'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isDeletable && (
                          <button onClick={(e) => handleDeleteOrder(e, order.id, s)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 active:scale-90 transition-all">
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
                        )}
                        <span className={`text-[7px] px-2.5 py-1.5 rounded-lg font-black tracking-widest border transition-colors ${
                          isDeletable ? 'bg-orange-50 text-orange-500 border-orange-100' : 
                          (s === 'SELESAI' || s === 'BERHASIL') ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-blue-50 text-blue-500 border-blue-100'
                        }`}>
                          {s === 'PENDING' ? 'MENUNGGU' : s}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 items-center text-left">
                      <div className="w-14 h-14 bg-slate-50 rounded-xl p-2 shrink-0 flex items-center justify-center border border-slate-50 overflow-hidden">
                        <img src={order.items?.[0]?.image} className="w-full h-full object-contain" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-bold text-slate-700 truncate mb-1 uppercase">{order.items?.[0]?.name}</h4>
                        <p className="text-[7px] text-slate-400 font-bold mb-1 uppercase">DARI CABANG: <span className="text-blue-600">{order.originWarehouse || 'TUPAREV'}</span></p>
                        <p className="text-sm font-black text-blue-600 tracking-tight uppercase">RP {Number(order.total || 0).toLocaleString()}</p>
                      </div>
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-300 transition-transform duration-300 ${expandedOrder === order.id ? 'rotate-180 bg-blue-50 text-blue-400' : ''}`}>
                        <i className="ri-arrow-down-s-line text-lg"></i>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedOrder === order.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="mt-5 pt-5 border-t border-slate-50 space-y-4 text-left">
                            
                            {/* INFO PENERIMA & CABANG (SINKRON DENGAN CHECKOUT BARU) */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                <div>
                                    <p className="text-[6px] text-slate-400 font-black tracking-widest uppercase">PENERIMA</p>
                                    <p className="text-[8px] text-slate-900 font-black uppercase">{order.customerName || 'USER MEGA'}</p>
                                </div>
                                <div>
                                    <p className="text-[6px] text-slate-400 font-black tracking-widest uppercase">TELEPON</p>
                                    <p className="text-[8px] text-slate-900 font-black uppercase">{order.customerPhone || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[6px] text-slate-400 font-black tracking-widest uppercase">DIKIRIM DARI</p>
                                    <p className="text-[8px] text-blue-600 font-black uppercase">GUDANG {order.originWarehouse || 'TUPAREV'}</p>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                              {order.items?.map((item, i) => (
                                <div key={i} className="flex justify-between text-[8px] font-bold text-slate-400 tracking-tight uppercase">
                                  <span className="truncate max-w-[70%]">{item.quantity}X {item.name}</span>
                                  <span className="text-slate-900 font-black shrink-0 ml-2">RP {(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/order/${order.id}`); }} 
                                className="flex-1 py-3.5 bg-white text-slate-900 rounded-xl text-[9px] font-black tracking-[0.15em] border border-slate-100 shadow-sm active:scale-95 transition-all uppercase"
                              >
                                DETAIL PESANAN
                              </button>
                              {isDeletable && order.invoice_url && (
                                <a href={order.invoice_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="flex-1 py-3.5 bg-blue-600 text-white text-center rounded-xl text-[9px] font-black tracking-[0.15em] shadow-lg shadow-blue-100 active:scale-95 transition-all uppercase"
                                >
                                  BAYAR SEKARANG
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-48 text-center uppercase">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-50">
                  <i className="ri-shopping-bag-3-line text-3xl text-slate-200"></i>
                </div>
                <p className="text-[10px] font-black text-slate-300 tracking-[0.2em]">RIWAYAT KOSONG</p>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
    </div>
  );
}