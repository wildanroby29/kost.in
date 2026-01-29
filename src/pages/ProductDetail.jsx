import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// --- FIREBASE IMPORT ---
import { db, auth } from '../firebase';
import { doc, updateDoc, arrayUnion, onSnapshot, setDoc } from 'firebase/firestore';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // 1. UPDATE JUMLAH KERANJANG DARI FIREBASE (REAL-TIME)
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const unsubCart = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const cart = snapshot.data().cart || [];
            const total = cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
            setCartCount(total);
          }
        });
        return () => unsubCart();
      } else {
        setCartCount(0);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. TAMBAH KE KERANJANG KE FIREBASE
  const addToCart = async () => {
    if (!product) return;
    
    const user = auth.currentUser;
    if (!user) {
      setToastMsg('MAAF, SILAKAN LOGIN TERLEBIH DAHULU');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/login');
      }, 1500);
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const cartId = `${product.id}`; 
      
      const newItem = {
        cartId: cartId,
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0]?.src,
        quantity: 1,
        weight: product.weight || 1000 
      };

      await updateDoc(userRef, {
        cart: arrayUnion(newItem)
      }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(userRef, { cart: [newItem] }, { merge: true });
        }
      });

      setToastMsg('BERHASIL DITAMBAHKAN');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error("Gagal menulis ke Firebase:", err);
      setToastMsg('GAGAL MENAMBAHKAN DATA');
      setShowToast(true);
    }
  };

  // 3. AMBIL DATA PRODUK
  useEffect(() => {
    const getProductData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/woo`, {
          params: { id: id, _t: Date.now() }
        });
        const data = response.data;
        if (data && String(data.id) === String(id)) {
          setProduct(data);
        } else if (Array.isArray(data)) {
          const match = data.find(p => String(p.id) === String(id));
          setProduct(match || null);
        }
      } catch (err) {
        console.error("❌ Gagal load data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      getProductData();
      window.scrollTo(0, 0);
    }
  }, [id]);

  // LOGIKA BERBAGI
  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setToastMsg('LINK BERHASIL DISALIN');
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setToastMsg('LINK BERHASIL DISALIN');
    }
    setShowToast(true);
    setIsShareOpen(false);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleShareSocial = (platform) => {
    const url = window.location.href;
    const productName = product?.name || 'Produk';
    const price = parseInt(product?.price || 0).toLocaleString('id-ID');
    const message = `*${productName}*\n💰 Harga: Rp${price}\n\nCek detail selengkapnya di Mega Utama:\n${url}`;
    let shareUrl = platform === 'wa' 
      ? `https://wa.me/?text=${encodeURIComponent(message)}` 
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
    setIsShareOpen(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center uppercase tracking-widest">
        <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
        <h2 className="text-[11px] font-bold text-slate-800">PRODUK TIDAK DITEMUKAN</h2>
        <button onClick={() => navigate('/')} className="mt-6 px-10 py-3.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-lg shadow-blue-100">KEMBALI KE BERANDA</button>
    </div>
  );

  // LOGIKA DISKON WOOCOMMERCE
  const salePrice = parseInt(product.price || 0);
  const regularPrice = parseInt(product.regular_price || 0);
  const hasDiscount = regularPrice > salePrice;
  const discountPercent = hasDiscount ? Math.round(((regularPrice - salePrice) / regularPrice) * 100) : 0;

  return (
    <div key={id} className="min-h-screen bg-white pb-32 antialiased text-slate-900 flex justify-center uppercase">
      <div className="w-full max-w-md relative bg-white min-h-screen border-x border-slate-50">
        
        <header className="fixed top-0 w-full max-w-md z-[100] px-6 pt-12 pb-4 bg-white/90 backdrop-blur-md flex justify-between items-center border-b border-slate-50">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-100 text-slate-400 active:scale-90 transition-transform">
            <i className="ri-arrow-left-line text-lg"></i>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">DETAIL PRODUK</span>
          <button onClick={() => setIsShareOpen(true)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-100 text-slate-400 active:scale-90 transition-transform">
            <i className="ri-share-line text-lg"></i>
          </button>
        </header>

        <main className="pt-32">
          <div className="px-6 mb-8">
            <div className="relative aspect-square bg-white rounded-[32px] p-8 flex items-center justify-center shadow-sm border border-slate-50 overflow-hidden">
              <img src={product.images?.[0]?.src} className="w-full h-full object-contain mix-blend-multiply scale-90" alt={product.name} />
              
              {/* LABEL API & PERSENTASE DISKON */}
              {hasDiscount && (
                <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                  <div className="bg-orange-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl shadow-orange-100 animate-bounce">
                    <i className="ri-fire-fill text-xs"></i>
                    <span className="text-[9px] font-black tracking-widest">HOT PROMO</span>
                  </div>
                  <div className="bg-red-600 text-white px-3 py-1.5 rounded-xl shadow-xl shadow-red-100 w-fit">
                    <span className="text-[9px] font-black tracking-widest">DISKON {discountPercent}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-8 pb-10">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold text-blue-600 tracking-widest text-left">
                {product.categories?.[0]?.name || 'PAINTS'}
              </p>
              {hasDiscount && (
                <span className="bg-red-50 text-red-600 text-[7px] font-black px-2 py-0.5 rounded border border-red-100 tracking-widest">MEGA SALE</span>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 leading-tight mb-4 tracking-tight text-left">
              {product.name}
            </h2>

            {/* HARGA CORET & HARGA UTAMA */}
            <div className="mb-8 text-left">
              {hasDiscount && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-slate-300 line-through font-bold decoration-red-500/20">
                    RP{regularPrice.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[9px] font-black text-red-600">
                    -{discountPercent}%
                  </span>
                </div>
              )}
              <div className="font-bold text-3xl tracking-tighter text-slate-900">
                RP{salePrice.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="mb-4">
               <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-4 px-1 text-left">DESKRIPSI PRODUK</h4>
               <div className="text-[12px] font-medium text-slate-500 leading-relaxed normal-case font-sans text-left" 
                   dangerouslySetInnerHTML={{ __html: product.description }}>
               </div>
            </div>
          </div>
        </main>

        {/* FOOTER ACTIONS */}
        <div className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-6 z-[100] flex gap-3 shadow-2xl">
          <button onClick={() => navigate('/cart')} className="relative w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm active:scale-90 transition-transform">
            <i className="ri-shopping-basket-line text-xl"></i>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={addToCart} className="flex-1 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-100 active:scale-95 transition-transform">
            <i className="ri-add-fill text-xl font-bold"></i>
            <span className="text-[11px] font-bold uppercase tracking-widest">TAMBAH KERANJANG</span>
          </button>
        </div>

        <AnimatePresence>
          {isShareOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                onClick={() => setIsShareOpen(false)} className="fixed inset-0 bg-black/40 z-[120] backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                transition={{ type: "spring", damping: 25, stiffness: 200 }} 
                className="fixed bottom-0 w-full max-w-md bg-white rounded-t-[40px] z-[130] p-8 pb-12">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                <h3 className="text-center font-bold text-slate-900 mb-8 uppercase text-[11px] tracking-[0.2em]">BAGIKAN PRODUK</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button onClick={() => handleShareSocial('wa')} className="flex flex-col items-center gap-3 active:scale-90 transition-transform">
                    <div className="w-16 h-16 bg-green-50 rounded-[24px] flex items-center justify-center text-green-500 text-3xl"><i className="ri-whatsapp-fill"></i></div>
                    <span className="text-[9px] font-bold text-slate-400">WHATSAPP</span>
                  </button>
                  <button onClick={() => handleShareSocial('fb')} className="flex flex-col items-center gap-3 active:scale-90 transition-transform">
                    <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-600 text-3xl"><i className="ri-facebook-box-fill"></i></div>
                    <span className="text-[9px] font-bold text-slate-400">FACEBOOK</span>
                  </button>
                  <button onClick={handleCopyLink} className="flex flex-col items-center gap-3 active:scale-90 transition-transform">
                    <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-slate-900 text-3xl"><i className="ri-links-line"></i></div>
                    <span className="text-[9px] font-bold text-slate-400">SALIN LINK</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[150] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className="bg-slate-900 text-white px-8 py-3.5 rounded-full shadow-2xl flex items-center gap-3 border border-white/10">
            <i className="ri-check-line text-green-400 font-bold"></i>
            <span className="text-[10px] font-bold tracking-widest">{toastMsg}</span>
          </div>
        </div>

      </div>
    </div>
  );
}