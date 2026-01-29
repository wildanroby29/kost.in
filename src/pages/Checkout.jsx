import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// --- FIREBASE IMPORT ---
import { db, auth } from '../firebase'; 
import { collection, addDoc, doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';

// Marker Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const WAREHOUSES = [
  { id: 1, name: "TUPAREV", lat: -6.3015, lon: 107.2975, address: "JL. TUPAREV NO. 123, KARAWANG" },
  { id: 2, name: "CIKARANG", lat: -6.2847, lon: 107.1706, address: "JL. RAYA CIKARANG NO. 45, BEKASI" },
  { id: 3, name: "PERUMNAS", lat: -6.3265, lon: 107.2952, address: "PERUMNAS KARAWANG, TELUKJAMBE" },
  { id: 4, name: "INTERCHANGE", lat: -6.3458, lon: 107.2885, address: "INTERCHANGE KARAWANG BARAT" },
  { id: 5, name: "LAMARAN", lat: -6.3094, lon: 107.3328, address: "JL. LAMARAN RAYA, KARAWANG" },
  { id: 6, name: "KOSAMBI", lat: -6.3572, lon: 107.3785, address: "KLARI-KOSAMBI, KARAWANG" },
  { id: 7, name: "KLARI", lat: -6.3533, lon: 107.3592, address: "KECAMATAN KLARI, KARAWANG" },
  { id: 10, name: "PURWAKARTA", lat: -6.5544, lon: 107.4431, address: "JL. RAYA PURWAKARTA NO. 88" },
];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function MapController({ flyToPos }) {
  const map = useMap();
  useEffect(() => {
    if (flyToPos) map.flyTo(flyToPos, 16, { animate: true, duration: 1.5 });
  }, [flyToPos, map]);
  return null;
}

function MapEvents({ setPosition, setAddrData, setIsMoving }) {
  const debounceRef = useRef(null);
  useMapEvents({
    movestart: () => {
      setIsMoving(true);
      setAddrData(prev => ({ ...prev, display_name: 'MENCARI ALAMAT...' }));
    },
    moveend: (e) => {
      setIsMoving(false);
      const center = e.target.getCenter();
      setPosition([center.lat, center.lng]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}`,
            { headers: { 'User-Agent': 'MegaUtamaApp/1.0' } }
          );
          const data = await res.json();
          setAddrData(prev => ({
            ...prev,
            display_name: data.display_name || "ALAMAT TIDAK DITEMUKAN"
          }));
        } catch (err) {
          setAddrData(prev => ({ ...prev, display_name: "KONEKSI BERMASALAH" }));
        }
      }, 700);
    }
  });
  return null;
}

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [position, setPosition] = useState([-6.3015, 107.2975]);
  const [flyToPos, setFlyToPos] = useState(null);
  const [tempAddrData, setTempAddrData] = useState({ display_name: '', patokan: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [shipping, setShipping] = useState({ address: '', patokan: '', lat: null, lon: null, name: '', phone: '' });
  const [selectedWarehouse, setSelectedWarehouse] = useState(WAREHOUSES[0]);
  const [courierOptions, setCourierOptions] = useState([]);
  const [loadingOngkir, setLoadingOngkir] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [usePointsToggle, setUsePointsToggle] = useState(false);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('checkout_items')) || [];
    if (savedCart.length === 0) { navigate('/cart'); return; }
    
    const validatedCart = savedCart.map(item => ({
      ...item,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      weight: Number(item.weight || 1000)
    }));
    
    setCart(validatedCart);

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        return onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserPoints(docSnap.data().points || 0);
          }
        });
      }
    });
    return () => unsubscribe && typeof unsubscribe === 'function' && unsubscribe();
  }, [navigate]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalWeight = cart.reduce((acc, item) => acc + (item.weight * item.quantity), 0);
  const totalWeightKg = totalWeight / 1000;

  const baseOngkir = selectedCourier ? Number(selectedCourier.price) : 0;
  const pDisc = usePointsToggle ? Math.min(subtotal, userPoints) : 0;
  const totalBill = Math.max(0, (subtotal - pDisc) + baseOngkir);
  const earnedPoints = Math.floor(subtotal / 100000) * 1000;

  const calculateShippingCost = async (targetLat, targetLon, currentWh = selectedWarehouse) => {
    if (!targetLat || !targetLon) return;
    setLoadingOngkir(true);
    setSelectedCourier(null);
    setCourierOptions([]);
    
    let options = [];

    // Opsi Ambil Sendiri Selalu Ada
    options.push({
        courier_name: 'AMBIL SENDIRI',
        courier_code: 'self',
        courier_service_name: 'PICKUP DI TOKO',
        price: 0,
        duration: 'SAAT TOKO BUKA'
    });

    try {
      const response = await axios.post(`/api/get-ongkir-biteship`, {
        origin_latitude: Number(currentWh.lat),
        origin_longitude: Number(currentWh.lon),
        destination_latitude: Number(targetLat),
        destination_longitude: Number(targetLon),
        items: cart.map(item => ({
          name: item.name.substring(0, 30),
          value: item.price,
          weight: item.weight, 
          quantity: item.quantity
        }))
      });

      if (response.data?.pricing) {
        const biteshipOptions = response.data.pricing;
        const distance = calculateDistance(currentWh.lat, currentWh.lon, targetLat, targetLon);
        
        // VALIDASI MU EXPRESS: Hanya muncul jika Jarak <= 10KM DAN Berat <= 26KG
        if (distance <= 10 && totalWeightKg <= 26) {
            const minPrice = Math.min(...biteshipOptions.map(o => o.price));
            options.push({
                courier_name: 'MU EXPRESS',
                courier_code: 'mu',
                courier_service_name: 'PROMO 50%',
                price: Math.round(minPrice * 0.5),
                duration: '1-3 JAM'
            });
        }
        options = [...options, ...biteshipOptions];
      }
    } catch (err) {
        // Fallback jika API Biteship Error & Berat Masih masuk kategori
        if (totalWeightKg <= 26) {
            options.push({ courier_name: 'MU EXPRESS', courier_code: 'mu', courier_service_name: 'INSTANT', price: 15000, duration: '1-2 JAM' });
        }
    } finally { 
        setCourierOptions(options);
        setLoadingOngkir(false); 
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setFlyToPos(newPos);
        setPosition(newPos);
      }, (err) => alert("GAGAL AKSES LOKASI: " + err.message));
    }
  };

  const confirmLocation = () => {
    if (!customerInfo.name || !customerInfo.phone) {
        alert("NAMA DAN NOMOR HP WAJIB DIISI!");
        return;
    }
    setShipping({ 
      address: tempAddrData.display_name, 
      patokan: tempAddrData.patokan, 
      lat: position[0], 
      lon: position[1],
      name: customerInfo.name,
      phone: customerInfo.phone
    });
    setShowMap(false);
    calculateShippingCost(position[0], position[1]);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data?.[0]) {
        const newPos = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setFlyToPos(newPos);
        setPosition(newPos);
        setTempAddrData(prev => ({ ...prev, display_name: data[0].display_name }));
      }
    } catch (err) { console.error(err); }
  };

  const handleProcessOrder = async () => {
    const user = auth.currentUser;
    if (!user) return alert("SILAKAN LOGIN!");
    if (!shipping.name || !shipping.phone) return alert("DATA PENERIMA BELUM LENGKAP!");
    if (!selectedCourier) return alert("PILIH METODE PENGIRIMAN!");
    
    setIsProcessing(true);
    try {
      const orderId = "ORD-" + Date.now();
      const { data } = await axios.post(`/api/xendit`, {
        orderId,
        totalBill: Math.round(totalBill),
        customerEmail: user.email,
      });

      if (data.invoice_url) {
        const finalShipping = selectedCourier.courier_code === 'self' 
            ? { ...shipping, address: `[AMBIL DI TOKO] ${selectedWarehouse.address}` }
            : shipping;

        await addDoc(collection(db, "orders"), {
          orderId, 
          userId: user.uid, 
          userEmail: user.email,
          customerName: shipping.name.toUpperCase(), 
          customerPhone: shipping.phone, 
          originWarehouse: selectedWarehouse.name, 
          branchAddress: selectedWarehouse.address || "MEGA UTAMA OFFICIAL",
          total: Math.round(totalBill), 
          status: 'MENUNGGU PEMBAYARAN',
          invoice_url: data.invoice_url, 
          shipping: finalShipping, 
          courier: selectedCourier,
          items: cart, 
          totalWeight, 
          pointsUsed: pDisc, 
          pointsEarned: earnedPoints, 
          createdAt: new Date() 
        });

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          cart: [], 
          points: usePointsToggle ? increment(-pDisc) : increment(0)
        });

        localStorage.removeItem('checkout_items');
        window.location.href = data.invoice_url;
      }
    } catch (err) { 
        alert("GAGAL: " + (err.response?.data?.message || err.message)); 
    } finally { setIsProcessing(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#FDFDFD] flex justify-center antialiased font-sans uppercase font-black">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <div className="w-full max-w-md bg-white min-h-screen relative flex flex-col shadow-2xl border-x border-slate-50 overflow-hidden text-left">
        
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-50 h-16 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 active:scale-90 transition-all">
              <i className="ri-arrow-left-s-line text-lg text-slate-800"></i>
            </button>
            <div>
              <h1 className="text-[10px] tracking-[0.1em] font-bold text-slate-900 leading-none uppercase">CHECKOUT</h1>
              <p className="text-[8px] text-blue-500 tracking-widest mt-0.5 font-bold uppercase">MEGA UTAMA SYSTEM</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 pt-6 pb-40 overflow-y-auto no-scrollbar space-y-6">
          {/* Ringkasan Item */}
          <section className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
            <button onClick={() => setShowItems(!showItems)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                <h2 className="text-[9px] font-black text-slate-900 tracking-widest uppercase">RINGKASAN ITEM ({cart.reduce((a, b) => a + b.quantity, 0)})</h2>
              </div>
              <motion.i animate={{ rotate: showItems ? 180 : 0 }} className="ri-arrow-down-s-line text-slate-400"></motion.i>
            </button>
            <AnimatePresence>
              {showItems && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 space-y-2">
                  <div className="p-3 mb-2 bg-blue-50 rounded-xl flex justify-between items-center">
                    <span className="text-[8px] font-black text-blue-600 uppercase">TOTAL BERAT:</span>
                    <span className={`text-[10px] font-black uppercase ${totalWeightKg > 26 ? 'text-red-500' : 'text-blue-600'}`}>{totalWeightKg.toFixed(1)} KG</span>
                  </div>
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-t border-slate-50">
                      <div className="flex gap-3 items-center text-left">
                        <img src={item.image} className="w-8 h-8 object-contain" alt="" />
                        <div>
                          <p className="text-[8px] font-bold text-slate-800 line-clamp-1">{item.name}</p>
                          <p className="text-[7px] text-blue-600 font-black uppercase">
                            {item.quantity} UNIT - {(item.weight / 1000).toFixed(1)} KG/UNIT
                          </p>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-slate-900 uppercase">RP {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Alamat */}
          <section className="space-y-3">
            <h2 className="text-[8px] font-black text-slate-400 tracking-widest ml-1 uppercase">ALAMAT TUJUAN</h2>
            <div onClick={() => setShowMap(true)} className="p-4 bg-white border border-slate-100 rounded-3xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <i className="ri-map-pin-2-fill text-blue-600 text-xl"></i>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[9px] font-black text-slate-900 truncate mb-0.5 uppercase">{shipping.address || 'SET LOKASI PENGIRIMAN'}</p>
                <p className="text-[8px] text-blue-500 font-bold truncate tracking-widest uppercase">
                    {shipping.name ? `${shipping.name} | ${shipping.phone}` : 'KLIK UNTUK PIN POINT & ISI DATA'}
                </p>
              </div>
            </div>
          </section>

          {shipping.lat && (
            <>
              <section className="space-y-3">
                <h2 className="text-[8px] font-black text-slate-400 tracking-widest ml-1 uppercase">PENGIRIMAN DARI (CABANG)</h2>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {WAREHOUSES.map(wh => (
                    <button key={wh.id} onClick={() => { setSelectedWarehouse(wh); calculateShippingCost(shipping.lat, shipping.lon, wh); }}
                      className={`shrink-0 px-5 py-3 rounded-2xl border text-[8px] font-black transition-all uppercase ${selectedWarehouse.id === wh.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100'}`}>
                      {wh.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-[8px] font-black text-slate-400 tracking-widest uppercase">METODE PENGIRIMAN</h2>
                    <span className="text-[7px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full uppercase">RADIUS AKTIF</span>
                </div>

                {/* Info Jika Berat > 26KG */}
                {totalWeightKg > 26 && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                        <i className="ri-error-warning-fill text-red-500 text-lg"></i>
                        <p className="text-[7px] font-black text-red-600 uppercase">MU EXPRESS DINONAKTIFKAN KARENA BERAT MELEBIHI 26 KG. SILAKAN GUNAKAN EKSPEDISI LAIN.</p>
                    </div>
                )}

                <div className="space-y-2">
                  {loadingOngkir ? (
                    <div className="py-8 text-center bg-white border border-slate-100 rounded-3xl uppercase font-bold text-[8px] text-blue-600 animate-pulse">MENGHITUNG BIAYA...</div>
                  ) : (
                    courierOptions.map((c, idx) => {
                      const isSelected = selectedCourier?.courier_name === c.courier_name && selectedCourier?.courier_service_name === c.courier_service_name;
                      const isInternal = c.courier_code === 'mu' || c.courier_code === 'self';
                      
                      return (
                        <div key={idx} onClick={() => setSelectedCourier(c)} 
                          className={`p-4 rounded-2xl border flex justify-between items-center transition-all cursor-pointer ${isSelected ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 border border-slate-50 rounded-xl flex items-center justify-center p-1 shrink-0 ${isInternal ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                                {isInternal ? (
                                    <i className={c.courier_code === 'self' ? 'ri-store-2-line text-2xl' : 'ri-flashlight-fill text-2xl'}></i>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                                        <img 
                                          src={`https://biteship.com/storage/courier/logo/${c.courier_code.toLowerCase()}.png`} 
                                          className="w-full h-full object-contain absolute inset-0 z-10" 
                                          alt={c.courier_name}
                                          onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <i className="ri-truck-fill text-2xl text-slate-300"></i>
                                    </div>
                                )}
                            </div>
                            <div className="text-[9px] font-black text-slate-900 uppercase">
                              <p>{c.courier_name} <span className="bg-blue-600 text-white px-1 rounded-sm text-[7px]">{c.courier_service_name}</span></p>
                              <p className="text-[7px] text-slate-400 uppercase">ESTIMASI {c.duration}</p>
                            </div>
                          </div>
                          <p className="text-[10px] font-black text-blue-600 uppercase">{c.price === 0 ? 'GRATIS' : `RP ${Number(c.price).toLocaleString()}`}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </>
          )}

          {/* Reward & Summary */}
          <section className="space-y-3 pb-20">
            <div className="p-4 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center text-white"><i className="ri-copper-coin-fill text-lg"></i></div>
                <div>
                  <p className="text-[9px] font-black text-slate-900 uppercase">PAKAI {userPoints.toLocaleString()} POIN</p>
                  <p className="text-[7px] text-slate-400 font-bold uppercase tracking-tight">POTONGAN RP {userPoints.toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setUsePointsToggle(!usePointsToggle)} className={`w-10 h-5 rounded-full relative transition-all ${usePointsToggle ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${usePointsToggle ? 'left-5.5' : 'left-0.5'}`}></div>
              </button>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] p-6 space-y-3 shadow-sm">
              <div className="flex justify-between text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase"><span>SUBTOTAL</span><span>RP {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase"><span>ONGKIR</span><span>RP {baseOngkir.toLocaleString()}</span></div>
              {pDisc > 0 && <div className="flex justify-between text-[8px] font-bold text-red-500 tracking-[0.2em] uppercase"><span>REDEEM POIN</span><span>-RP {pDisc.toLocaleString()}</span></div>}
              <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-900 uppercase">TOTAL BAYAR</span>
                <span className="text-xl font-black text-blue-600 uppercase">RP {totalBill.toLocaleString()}</span>
              </div>
            </div>
          </section>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-slate-50 p-6 z-[100]">
          <button disabled={!selectedCourier || isProcessing} onClick={handleProcessOrder} 
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-lg shadow-blue-100 disabled:bg-slate-100 active:scale-[0.98] transition-all uppercase">
            {isProcessing ? "MEMBUAT INVOICE..." : 'BAYAR SEKARANG'}
          </button>
        </footer>
      </div>

      <AnimatePresence>
        {showMap && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.4 }} className="fixed inset-0 z-[110] bg-white flex flex-col uppercase font-black">
            <header className="p-4 flex items-center gap-3 border-b border-slate-50">
              <button onClick={() => setShowMap(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center"><i className="ri-arrow-left-line text-slate-800"></i></button>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="CARI LOKASI..." className="flex-1 bg-slate-50 p-3 rounded-xl text-[10px] font-black outline-none uppercase" />
            </header>
            <div className="flex-1 relative">
              <MapContainer center={position} zoom={16} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapController flyToPos={flyToPos} />
                <MapEvents setPosition={setPosition} setAddrData={setTempAddrData} setIsMoving={setIsMoving} />
              </MapContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none text-blue-600 text-4xl"><i className="ri-map-pin-2-fill"></i></div>
              <button onClick={handleCurrentLocation} className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center text-blue-600"><i className="ri-focus-3-line text-xl"></i></button>
            </div>
            
            <div className="p-6 bg-white border-t border-slate-50 text-left space-y-4 shadow-xl">
              <div className="grid grid-cols-2 gap-3 text-left">
                 <div className="space-y-1">
                    <p className="text-[7px] text-slate-400 ml-1 uppercase">NAMA PENERIMA</p>
                    <input type="text" placeholder="NAMA" value={customerInfo.name} onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value.toUpperCase()})} className="w-full p-3.5 bg-slate-50 rounded-xl text-[10px] font-black outline-none border border-slate-50 uppercase" />
                 </div>
                 <div className="space-y-1 text-left">
                    <p className="text-[7px] text-slate-400 ml-1 uppercase">NOMOR HP (WA)</p>
                    <input type="tel" placeholder="08..." value={customerInfo.phone} onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full p-3.5 bg-slate-50 rounded-xl text-[10px] font-black outline-none border border-slate-50" />
                 </div>
              </div>
              <p className="text-[9px] font-black text-slate-800 bg-blue-50/50 p-3 rounded-xl uppercase border border-blue-50 min-h-[40px] flex items-center text-left">
                {tempAddrData.display_name || 'GESER PIN UNTUK MENDAPATKAN ALAMAT'}
              </p>
              <input type="text" placeholder="DETAIL: BLOK / NOMOR RUMAH" value={tempAddrData.patokan} onChange={(e) => setTempAddrData({...tempAddrData, patokan: e.target.value.toUpperCase()})} className="w-full p-4 rounded-xl text-[10px] font-black border border-slate-100 uppercase outline-none" />
              <button onClick={confirmLocation} className="w-full py-4 bg-blue-600 text-white text-[9px] font-black rounded-xl uppercase shadow-lg shadow-blue-100">KONFIRMASI LOKASI</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
    </motion.div>
  );
}