import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- FIREBASE IMPORT (LOGIKA VITAL 100% UTUH) ---
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. FUNGSI DETEKSI BERAT SUPER AKURAT (Fix 0.0 KG)
  const extractWeightFromName = (name) => {
    if (!name) return 1000;
    const text = name.toUpperCase();
    
    // Mencari angka yang mungkin nempel dengan huruf (contoh: 4KG, 500GRAM, 1L)
    const regex = /(\d+(\.\d+)?)\s*(KG|GRAM|GR|LITER|L|ML)/;
    const match = text.match(regex);
    
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[3];

      if (unit === 'KG' || unit === 'LITER' || unit === 'L') {
        return value * 1000; // Balikin dalam Gram
      }
      if (unit === 'GRAM' || unit === 'GR' || unit === 'ML') {
        return value; 
      }
    }
    
    // Jika gagal deteksi dari teks, cek apakah ada field weight default atau balikin 1000 (1KG)
    return 1000; 
  };

  // 2. LOAD DATA DARI FIREBASE
  const loadCartData = useCallback(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        const firebaseCart = userData.cart || [];
        const normalizedCart = firebaseCart.map(item => {
          // Logika Penentuan Berat:
          // Cari angka di nama dulu karena itu yang paling valid buat user
          const weightFound = extractWeightFromName(item.name);

          return {
            ...item,
            cartId: item.cartId || `${item.id}-${item.variant}`,
            weight: weightFound // Paksa pakai hasil deteksi nama
          };
        });
        setCart(normalizedCart);
        
        setSelectedIds(prev => {
          if (prev.length === 0 && normalizedCart.length > 0) {
            return normalizedCart.map(item => item.cartId);
          }
          return prev;
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubCart = loadCartData();
        return () => { if (unsubCart) unsubCart(); };
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [loadCartData, navigate]);

  const cleanPrice = (price) => {
    if (!price) return 0;
    return parseFloat(price.toString().replace(/[^0-9.-]+/g, "")) || 0;
  };

  // 3. SYNC KE FIREBASE
  const saveAndSync = async (newCart) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { cart: newCart });
    } catch (err) {
      console.error("Gagal sinkronisasi:", err);
    }
  };

  const updateQuantity = (cartId, delta) => {
    const updated = cart.map(item => 
      item.cartId === cartId ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) } : item
    );
    saveAndSync(updated);
  };

  const removeFromCart = (cartId) => {
    const updated = cart.filter(item => item.cartId !== cartId);
    setSelectedIds(prev => prev.filter(sid => sid !== cartId));
    saveAndSync(updated);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cart.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cart.map(item => item.cartId));
    }
  };

  // 4. PERHITUNGAN TOTAL (FINAL)
  const selectedItems = cart.filter(item => selectedIds.includes(item.cartId));
  
  const subtotal = selectedItems.reduce((acc, item) => 
    acc + (cleanPrice(item.price) * (item.quantity || 1)), 0);

  // Kalkulasi Berat Total
  const totalWeightGram = selectedItems.reduce((acc, item) => 
    acc + (Number(item.weight || 1000) * (item.quantity || 1)), 0);
  
  const totalWeightKg = totalWeightGram / 1000;

  const handleGoToCheckout = () => {
    if (selectedItems.length === 0) return;
    localStorage.setItem('checkout_items', JSON.stringify(selectedItems));
    localStorage.removeItem('cart');
    window.dispatchEvent(new Event("storage"));
    navigate('/checkout');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex justify-center antialiased font-sans uppercase font-black">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

      <div className="w-full max-w-md bg-white min-h-screen relative flex flex-col shadow-2xl border-x border-slate-50">
        
        {/* HEADER DENGAN TOTAL BERAT */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-50 h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 active:scale-90 transition-all">
              <i className="ri-arrow-left-s-line text-lg text-slate-800"></i>
            </button>
            <div className="text-left">
              <h1 className="text-[10px] tracking-[0.1em] font-bold text-slate-900 leading-none">
                KERANJANG <span className={totalWeightKg > 26 ? "text-red-600" : "text-blue-600"}>({totalWeightKg.toFixed(1)} KG)</span>
              </h1>
              <p className="text-[8px] text-slate-400 tracking-widest mt-0.5">{cart.length} ITEMS</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={toggleSelectAll} className="text-[8px] font-bold text-slate-400 border border-slate-100 px-3 py-1.5 rounded-lg active:bg-slate-900 active:text-white transition-all">
              {selectedIds.length === cart.length ? 'LEPAS' : 'SEMUA'}
            </button>
          )}
        </header>

        {/* LIST ITEM */}
        <main className="flex-1 px-6 pt-6 pb-40 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="popLayout">
            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item) => {
                  const isSelected = selectedIds.includes(item.cartId);
                  const itemTotal = cleanPrice(item.price) * (item.quantity || 1);
                  const displayWeightUnit = (item.weight / 1000).toFixed(1);

                  return (
                    <motion.div 
                      layout key={item.cartId}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className={`flex items-center gap-3 p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm transition-all ${!isSelected && 'opacity-40 grayscale'}`}
                    >
                      <button 
                        onClick={() => setSelectedIds(prev => isSelected ? prev.filter(i => i !== item.cartId) : [...prev, item.cartId])}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'}`}
                      >
                        {isSelected && <i className="ri-check-line text-white text-[9px] font-black"></i>}
                      </button>

                      <div className="w-14 h-14 bg-slate-50 rounded-xl p-1.5 shrink-0">
                        <img src={item.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-[9px] text-slate-900 font-bold leading-tight mb-0.5 tracking-tight uppercase line-clamp-2">
                          {item.name}
                        </h4>
                        {/* INFO BERAT PER UNIT */}
                        <p className="text-[8px] text-blue-600 font-black uppercase mb-1">{displayWeightUnit} KG / UNIT</p>
                        <p className="text-[11px] text-slate-900 font-black tracking-tighter uppercase">RP {itemTotal.toLocaleString()}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button onClick={() => removeFromCart(item.cartId)} className="text-slate-200 active:text-red-500 transition-colors">
                          <i className="ri-delete-bin-7-line text-base"></i>
                        </button>
                        <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 gap-3">
                          <button onClick={() => updateQuantity(item.cartId, -1)} className="text-slate-400 font-bold text-xs">−</button>
                          <span className="text-[9px] text-slate-900 font-black">{item.quantity || 1}</span>
                          <button onClick={() => updateQuantity(item.cartId, 1)} className="text-slate-400 font-bold text-xs">+</button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center uppercase">
                 <p className="text-[11px] font-black text-slate-900 tracking-[0.2em] mb-2">KERANJANG KOSONG</p>
                 <button onClick={() => navigate('/')} className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[9px] font-bold tracking-[0.2em] mt-4 shadow-lg shadow-blue-100 active:scale-95 transition-all">CARI PRODUK</button>
              </div>
            )}
          </AnimatePresence>
        </main>

        {/* FOOTER - BERSIH TANPA ESTIMASI BERAT */}
        {cart.length > 0 && (
          <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-50 p-6 pb-8 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-5">
              <div className="text-left">
                <p className="text-[8px] text-slate-400 font-bold tracking-[0.2em] mb-0.5">ESTIMASI TOTAL</p>
                <p className="text-base text-slate-900 font-black tracking-tighter leading-none">RP {subtotal.toLocaleString()}</p>
              </div>
              <div className="text-[8px] text-blue-600 font-bold bg-blue-50 px-2.5 py-1.5 rounded-lg tracking-widest">
                {selectedIds.length} PRODUK
              </div>
            </div>
            <button 
              onClick={handleGoToCheckout} 
              disabled={selectedIds.length === 0}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-bold tracking-[0.2em] shadow-lg shadow-blue-100 active:scale-[0.98] disabled:bg-slate-100 transition-all uppercase"
            >
              PROSES CHECKOUT
            </button>
          </footer>
        )}
      </div>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
    </div>
  );
}