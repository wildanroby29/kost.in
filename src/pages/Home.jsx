import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// --- FIREBASE IMPORT ---
import { db, auth } from "../firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';


// --- FUNGSI DETEKSI BERAT (FUNGSI ASLI) ---
const extractWeight = (productName, description = "") => {
  const text = (productName + " " + description).toLowerCase().replace(/\s+/g, ' ');
  const weightMatch = text.match(/(\d+(\.\d+)?)\s*(kg|liter|l|pail)/);
  if (weightMatch) {
    const value = parseFloat(weightMatch[1]);
    const unit = weightMatch[3];
    if (unit === 'liter' || unit === 'l') return Math.round(value * 1300);
    if (unit === 'kg' || unit === 'pail') return Math.round(value * 1000);
  }
  return 2000;
};

export default function Home() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]); 
  const [saleProducts, setSaleProducts] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBrand, setActiveBrand] = useState('Semua');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [userData, setUserData] = useState({ firstName: 'TAMU', picture: null, initial: '?' });
  const [appConfig, setAppConfig] = useState({ broadcastMessage: '', promoBannerUrl: '', waCS: '' });
  const [carouselItems, setCarouselItems] = useState([]);
  const [greeting, setGreeting] = useState('SELAMAT DATANG');
  const [noResults, setNoResults] = useState(false);
  
  const observer = useRef();
  const isFetching = useRef(false);
  
  const brands = ['Semua', 'DISKON 🔥', 'Jotun', 'Dulux', 'Nippon', 'Avian', 'Mowilex'];

  // --- LOGIKA UPDATE DISKON ---
  const updateSaleProducts = (newItems) => {
    const sales = newItems.filter(p => 
      p.on_sale === true || (p.regular_price && parseFloat(p.price) < parseFloat(p.regular_price))
    );
    if (sales.length > 0) {
      setSaleProducts(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const filtered = sales.filter(item => !existingIds.has(item.id));
        return [...prev, ...filtered];
      });
    }
  };

  // --- LOGIKA AMBIL DISKON SECARA MASIF ---
  const fetchAllDiscounts = async () => {
    for (let p = 1; p <= 3; p++) {
      try {
        const res = await axios.get('/api/woo', { 
          params: { on_sale: true, per_page: 50, page: p, _t: Date.now() } 
        });
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) break;
        updateSaleProducts(data);
      } catch (e) {
        console.error("Gagal sinkron diskon");
      }
    }
  };

  // --- LOGIKA LOAD DATA GRID ---
  const loadProducts = async (keyword, pageNum, isNewSearch) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setNoResults(false);

    if (isNewSearch) {
      setLoading(true);
      if (pageNum === 1) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    try {
      const response = await axios.get('/api/woo', {
        params: {
          search: keyword || (activeBrand === 'Semua' || activeBrand === 'DISKON 🔥' ? '' : activeBrand),
          page: pageNum,
          per_page: 12,
          _t: Date.now()
        }
      });
      
      const incomingData = Array.isArray(response.data) ? response.data : [];
      updateSaleProducts(incomingData);

      if (isNewSearch && incomingData.length === 0) setNoResults(true);

      setProducts(prev => {
        if (isNewSearch) return incomingData;
        const existingIds = new Set(prev.map(p => p.id));
        return [...prev, ...incomingData.filter(p => !existingIds.has(p.id))];
      });

      setHasMore(incomingData.length >= 10);
    } catch (err) {
      setHasMore(false);
      if (isNewSearch) setNoResults(true);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  // --- LOGIKA INFINITY SCROLL ---
  const lastElementRef = useCallback(node => {
    if (loading || activeBrand === 'DISKON 🔥' || noResults) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isFetching.current) {
        setPage(prev => prev + 1);
      }
    }, { threshold: 0.5 });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, activeBrand, noResults]);

  useEffect(() => {
    if (page > 1 && activeBrand !== 'DISKON 🔥') {
      const currentKeyword = searchQuery || (activeBrand === 'Semua' ? '' : activeBrand);
      loadProducts(currentKeyword, page, false);
    }
  }, [page]);

  // --- INITIAL SYNC ---
  useEffect(() => {
    loadProducts("", 1, true);
    fetchAllDiscounts();

    const hour = new Date().getHours();
    if (hour < 11) setGreeting('SELAMAT PAGI');
    else if (hour < 15) setGreeting('SELAMAT SIANG');
    else if (hour < 19) setGreeting('SELAMAT SORE');
    else setGreeting('SELAMAT MALAM');

    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const name = user.displayName || 'PENGGUNA';
        setUserData({
          firstName: name.split(' ')[0].toUpperCase(),
          picture: user.photoURL,
          initial: name.charAt(0).toUpperCase()
        });
      }
    });

    const unsubConfig = onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists()) {
        const data = d.data();
        setAppConfig(data);
        setCarouselItems([
          { title: "PROMO UTAMA", img: data.promoBannerUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600", action: () => window.open(`https://wa.me/${data.waCS || ''}`, '_blank') },
          { title: "TREN WARNA JOTUN", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=600", action: () => handleBrandClick('Jotun') }
        ]);
      }
    });
    return () => { unsubAuth(); unsubConfig(); };
  }, []);

  // --- FUNGSI PENCARIAN PINTAR ---
  const executeSearch = (val) => {
    const term = val.trim();
    if (!term) return;
    const isBrand = brands.find(b => b.toLowerCase() === term.toLowerCase());
    setIsSearchOpen(false);
    setPage(1);
    if (isBrand && isBrand !== 'DISKON 🔥') {
      handleBrandClick(isBrand);
    } else {
      setSearchQuery(term);
      setActiveBrand('Semua');
      loadProducts(term, 1, true);
    }
  };

  const handleBrandClick = (brand) => {
    setActiveBrand(brand);
    setSearchQuery('');
    setNoResults(false);
    setPage(1);
    if (brand === 'DISKON 🔥') {
      setProducts(saleProducts);
      setHasMore(false);
    } else {
      loadProducts(brand === 'Semua' ? '' : brand, 1, true);
    }
  };

  // --- ADD TO CART ---
  const addToCart = async (e, product) => {
    e.preventDefault(); e.stopPropagation();
    const user = auth.currentUser;
    if (!user) return navigate('/login');
    setAddingId(product.id);
    const weight = extractWeight(product.name, product.description || "");
    const newItem = {
      cartId: `${product.id}-${Date.now()}`,
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.src || '',
      quantity: 1,
      weight: weight
    };
    try {
      await updateDoc(doc(db, "users", user.uid), { cart: arrayUnion(newItem) })
        .catch(async () => {
          await setDoc(doc(db, "users", user.uid), { cart: [newItem] }, { merge: true });
        });
      new BroadcastChannel('cart_channel').postMessage('update_cart');
      setTimeout(() => setAddingId(null), 800);
    } catch (err) { setAddingId(null); }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] pb-32 antialiased font-sans uppercase font-black overflow-x-hidden">
      
      {/* TOMBOL CHAT AI (FLOATING) */}
      <div className="fixed bottom-36 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] pointer-events-none">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/ai-chat')}
          className="absolute right-6 pointer-events-auto w-14 h-14 bg-gradient-to-tr from-blue-700 to-blue-500 rounded-full shadow-2xl flex items-center justify-center text-white border-2 border-white"
        >
          <i className="ri-robot-3-line text-2xl"></i>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
          </span>
        </motion.button>
      </div>

      {/* SEARCH OVERLAY */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-[110] bg-white p-6">
            <div className="flex items-center gap-4 pt-4 mb-8 max-w-md mx-auto">
              <button onClick={() => setIsSearchOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100"><i className="ri-arrow-left-line text-xl"></i></button>
              <input autoFocus type="text" placeholder="CARI PRODUK..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && executeSearch(searchQuery)} className="flex-1 bg-slate-50 py-3.5 px-5 rounded-2xl text-sm font-bold outline-none border border-transparent focus:border-blue-100 uppercase" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-6 pt-10 pb-6 flex justify-between items-center max-w-md mx-auto">
        <div>
          <p className="text-[10px] font-bold text-slate-400 mb-0.5 tracking-widest uppercase">{greeting},</p>
          <h1 className="text-xl font-bold text-slate-900 leading-tight uppercase">{userData.firstName} 👋</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm"><i className="ri-search-2-line text-lg"></i></button>
          <button onClick={() => navigate('/profile')} className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-blue-100 text-white font-bold">
            {userData.picture ? <img src={userData.picture} className="w-full h-full object-cover" alt="p" /> : userData.initial}
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 mb-6">
        <div className="border-y border-slate-100 py-3 overflow-hidden">
          <marquee className="text-[10px] font-bold text-slate-400 tracking-[0.2em]">{appConfig.broadcastMessage || 'SELAMAT DATANG DI MEGA UTAMA GROUP'}</marquee>
        </div>
      </div>

      {/* CAROUSEL UTAMA */}
      <div className="flex overflow-x-auto no-scrollbar gap-3 px-6 mb-8 snap-x snap-mandatory max-w-md mx-auto">
        {carouselItems.map((item, i) => (
          <div key={i} onClick={item.action} className="min-w-[85%] h-32 relative rounded-[24px] overflow-hidden snap-center flex-shrink-0 bg-slate-100 border border-slate-100 cursor-pointer">
            <img src={item.img} className="w-full h-full object-cover brightness-[0.7]" alt="b" />
            <div className="absolute inset-0 p-5 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent">
              <h2 className="text-white text-[13px] font-bold tracking-tight uppercase">{item.title}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* --- SLIDER DISKON --- */}
      {saleProducts.length > 0 && !searchQuery && activeBrand === 'Semua' && (
        <div className="mb-10 max-w-md mx-auto">
          <div className="px-6 mb-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] text-blue-600 tracking-[0.2em] mb-1">PENAWARAN TERBAIK</p>
              <h3 className="text-lg font-bold text-slate-900 uppercase">SPESIAL UNTUKMU 🔥</h3>
            </div>
            <button onClick={() => handleBrandClick('DISKON 🔥')} className="text-[10px] font-black text-red-600 border-b-2 border-red-600 pb-1 uppercase">LIHAT SEMUA</button>
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-4 px-6 snap-x snap-mandatory">
            {saleProducts.map((p) => (
              <motion.div whileTap={{ scale: 0.95 }} key={`sale-${p.id}`} className="min-w-[160px] max-w-[160px] bg-white rounded-[24px] p-3 shadow-sm border border-slate-50 snap-start">
                <Link to={`/product/${p.id}`}>
                  <div className="aspect-square mb-3 relative rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img src={p.images?.[0]?.src} className="w-full h-full object-contain mix-blend-multiply p-2" alt="p" />
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] px-2 py-1 rounded-bl-xl font-black uppercase tracking-tighter">DISKON!</div>
                  </div>
                  <h4 className="text-[10px] font-bold text-slate-800 line-clamp-1 mb-1 uppercase">{p.name}</h4>
                  <p className="text-[8px] text-slate-400 line-through uppercase">RP{parseInt(p.regular_price || 0).toLocaleString()}</p>
                  <p className="text-[11px] font-bold text-red-600 uppercase">RP{parseInt(p.price || 0).toLocaleString()}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER BRAND */}
      <div className="px-6 pb-6 overflow-x-auto no-scrollbar flex gap-2.5 max-w-md mx-auto">
        {brands.map((b) => (
          <button 
            key={b} 
            onClick={() => handleBrandClick(b)} 
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-bold transition-all border whitespace-nowrap active:scale-90
              ${activeBrand === b 
                ? (b === 'DISKON 🔥' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-blue-600 text-white border-blue-600 shadow-lg') 
                : (b === 'DISKON 🔥' ? 'bg-white text-red-600 border-red-600' : 'bg-white text-slate-400 border-slate-100')
              }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* MAIN GRID */}
      <main className="px-6 max-w-md mx-auto min-h-[400px]">
        <h3 className="text-lg font-bold text-slate-900 uppercase mb-6">
          {searchQuery ? `HASIL: ${searchQuery}` : (activeBrand === 'DISKON 🔥' ? 'PROMO SPESIAL' : 'SEMUA PRODUK')}
        </h3>

        <AnimatePresence mode='wait'>
          {noResults ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-20 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 border-4 border-dashed border-slate-100 shadow-sm">
                <i className="ri-search-eye-line text-4xl text-slate-200"></i>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-2 uppercase">Data Tidak Ada</h4>
              <p className="text-[10px] text-slate-400 px-10 leading-relaxed uppercase">Produk tidak ditemukan.</p>
              <button onClick={() => handleBrandClick('Semua')} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black shadow-xl shadow-blue-100 active:scale-95 transition-all uppercase">LIHAT SEMUA</button>
            </motion.div>
          ) : (
            <motion.div layout className="grid grid-cols-2 gap-x-3 gap-y-10">
              {products.map((p, idx) => (
                <motion.div layout initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} ref={idx === products.length - 1 ? lastElementRef : null} key={`prod-${p.id}-${idx}`} className="flex flex-col">
                  <Link to={`/product/${p.id}`}>
                    <div className="aspect-square bg-white rounded-[20px] mb-3 p-3 flex items-center justify-center shadow-sm border border-slate-50 relative overflow-hidden">
                      <img src={p.images?.[0]?.src} className="w-full h-full object-contain mix-blend-multiply" alt="p" />
                      {addingId === p.id && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center backdrop-blur-[2px] z-10">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold"><i className="ri-check-line"></i></div>
                        </div>
                      )}
                      {p.on_sale && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-[7px] w-7 h-7 rounded-full flex items-center justify-center font-black">
                          <i className="ri-fire-fill text-[10px]"></i>
                        </div>
                      )}
                    </div>
                    <div className="px-1">
                      <p className="text-[8px] font-bold text-blue-600 tracking-widest mb-1 uppercase">{p.categories?.[0]?.name || 'PAINTS'}</p>
                      <h4 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2 h-7 uppercase">{p.name}</h4>
                    </div>
                  </Link>
                  <div className="mt-2.5 px-1 flex justify-between items-center">
                    <div>
                      {p.on_sale && <p className="text-[8px] text-slate-400 line-through uppercase">RP{parseInt(p.regular_price || 0).toLocaleString()}</p>}
                      <p className="text-[12px] font-bold text-slate-900 uppercase">RP{parseInt(p.price || 0).toLocaleString()}</p>
                    </div>
                    <button onClick={(e) => addToCart(e, p)} className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-75 transition-all"><i className="ri-add-line text-lg"></i></button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {loading && <div className="py-12 flex justify-center w-full"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}
      </main>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
    </div>
  );
}