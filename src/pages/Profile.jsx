import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- FIREBASE IMPORT ---
// Pastikan path ../firebase ini mengarah ke config yang benar!
import { db, auth } from '../firebase'; 
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  collection, 
  onSnapshot, 
  setDoc, 
  increment 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('REWARDS'); 
  const [editData, setEditData] = useState({ name: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false); 

  const [dynamicRewards, setDynamicRewards] = useState([]);
  const [dbBranches, setDbBranches] = useState([]); 
  const [dbConsultants, setDbConsultants] = useState([]); 
  const [appConfig, setAppConfig] = useState({ waCS: '628123456789' });

  const [selectedReward, setSelectedReward] = useState(null);
  const [showBranches, setShowBranches] = useState(false);
  const [showConsultants, setShowConsultants] = useState(false);

  const weeklyRewards = [10, 10, 15, 20, 25, 30, 100]; 
  const nextLevelPoints = 50000; 

  useEffect(() => {
    let unsubUser = () => {};
    
    // 1. MONITOR AUTH STATE
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        console.log("LOGIN SEBAGAI:", u.uid); // Cek UID di Inspect Element
        const userRef = doc(db, "users", u.uid);
        
        // 2. REAL-TIME MONITOR DATA USER
        unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            console.log("DATA DITEMUKAN:", data);
            
            setUser({
              ...data,
              points: Number(data.points || 0) 
            });
            
            setEditData({ 
              name: data.name || '', 
              address: data.address || '' 
            });
          } else {
            // Jika dokumen user belum ada, buatkan default
            const defaultUser = { 
              name: u.displayName || 'MEMBER BARU', 
              points: 0, 
              avatar: u.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' 
            };
            setDoc(userRef, defaultUser, { merge: true });
            setUser(defaultUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("Gagal Ambil Data:", error);
          setLoading(false);
        });
      } else {
        if (!isLoggingOut) navigate('/login');
      }
    });

    // 3. MONITOR DATA LAINNYA (TIDAK ADA YANG DIHAPUS)
    const unsubRewards = onSnapshot(collection(db, "rewards"), (snapshot) => {
      const allRewards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDynamicRewards([
        { title: "HADIAH FISIK", items: allRewards.filter(i => i.category === "HADIAH FISIK") },
        { title: "PROMO & VOUCHER", items: allRewards.filter(i => i.category === "PROMO & VOUCHER") }
      ]);
    });

    const unsubBranches = onSnapshot(collection(db, "branches"), (snapshot) => {
      setDbBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCons = onSnapshot(collection(db, "consultants"), (snapshot) => {
      setDbConsultants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubConfig = onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if(d.exists()) setAppConfig(d.data());
    });

    return () => { 
      unsubscribeAuth(); unsubUser(); unsubRewards(); unsubBranches(); unsubCons(); unsubConfig(); 
    };
  }, [navigate, isLoggingOut]);

  // --- FUNGSI-FUNGSI UTAMA (TETAP UTUH) ---
  const handleCheckIn = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (user.lastCheckInDate === today) return; 
    try {
      const currentDayIndex = (user.checkInStreak || 0) % 7;
      const reward = weeklyRewards[currentDayIndex];
      await updateDoc(doc(db, "users", auth.currentUser.uid), { 
        points: increment(reward), 
        lastCheckInDate: today, 
        checkInStreak: (user.checkInStreak || 0) + 1 
      });
    } catch (err) { console.error(err); }
  };

  const handleRedeem = async () => {
    if (user.points < selectedReward.cost) return alert("POIN TIDAK CUKUP!");
    try {
      const orderId = `RW-${Date.now()}`;
      const newItem = { 
        id: orderId, name: selectedReward.name, img: selectedReward.img, 
        cost: selectedReward.cost, date: new Date().toISOString(), 
        status: 'PENDING', userId: auth.currentUser.uid, userName: user.name
      };
      await updateDoc(doc(db, "users", auth.currentUser.uid), { 
        points: increment(-selectedReward.cost), 
        collection: arrayUnion(newItem) 
      });
      await setDoc(doc(db, "orders_rewards", orderId), newItem);
      setSelectedReward(null);
      alert("PENUKARAN BERHASIL!");
    } catch (err) { alert("GAGAL PENUKARAN!"); }
  };

  const handleUpdateProfile = async () => {
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), editData);
      alert("PROFIL DIPERBARUI!");
    } catch (err) { alert("GAGAL UPDATE!"); }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true); 
    await new Promise(r => setTimeout(r, 1000));
    await signOut(auth);
    localStorage.clear();
    navigate('/login');
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center font-black uppercase text-blue-600 animate-pulse">
      SYNCING DATABASE...
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans pb-32 text-slate-900 antialiased uppercase relative overflow-x-hidden">
      
      {/* HEADER POIN */}
      <header className="px-6 pt-14 pb-4 flex justify-between items-center text-left">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[20px] bg-slate-50 border border-slate-100 overflow-hidden shadow-sm">
            <img src={user.avatar} className="w-full h-full object-cover" alt="pfp" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 tracking-widest leading-none mb-1">MEMBER LEVEL</p>
            <h1 className="text-sm font-black text-slate-800 tracking-tight">{user.name}</h1>
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {activeTab === 'SETTING' ? (
            <motion.button key="btn-save" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onClick={handleUpdateProfile} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest shadow-lg shadow-blue-100">
              SIMPAN
            </motion.button>
          ) : (
            <motion.div key="points" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-50 px-4 py-2.5 rounded-[18px] border border-slate-100 shadow-sm flex items-center gap-2">
              <i className="ri-copper-coin-fill text-yellow-500 text-lg"></i>
              <span className="text-sm font-black text-slate-800">{(user.points || 0).toLocaleString('id-ID')}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* PROGRESS BAR */}
      <div className="px-7 mb-8 text-left">
        <div className="flex justify-between text-[8px] font-black text-slate-400 mb-1.5 tracking-widest">
          <span>PROGRESS LEVEL</span>
          <span>{user.points} / {nextLevelPoints} PTS</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((user.points / nextLevelPoints) * 100, 100)}%` }} className="h-full bg-blue-600 rounded-full" />
        </div>
      </div>

      <main className="px-6 space-y-10">
        {/* TAB NAVIGATION */}
        <div className="flex space-x-10 border-b border-slate-50 px-2 overflow-x-auto no-scrollbar">
           {['REWARDS', 'COLLECTION', 'SETTING', 'CARE'].map(t => (
             <button key={t} onClick={() => setActiveTab(t)} className={`pb-4 text-[11px] font-black tracking-widest relative transition-colors ${activeTab === t ? 'text-blue-600' : 'text-slate-400'}`}>
               {t}
               {activeTab === t && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
             </button>
           ))}
        </div>

        {/* CONTENT TABS */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'REWARDS' && (
              <motion.div key="rew" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                <section className="text-left bg-slate-50/50 p-6 rounded-[35px] border border-slate-50">
                    <div className="flex justify-between items-end mb-5 px-1">
                      <h2 className="text-[10px] font-black text-slate-800 tracking-widest">DAILY MISSION</h2>
                      <p className="text-[9px] font-black text-blue-600 tracking-widest">DAY {(user.checkInStreak % 7) || 0}/7</p>
                    </div>
                    <div className="flex justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
                      {weeklyRewards.map((r, i) => {
                        const isClaimed = (user.checkInStreak || 0) % 7 > i || ((user.checkInStreak || 0) > 0 && (user.checkInStreak % 7 === 0));
                        const isTodayDone = user.lastCheckInDate === new Date().toISOString().split('T')[0];
                        const isCurrent = (user.checkInStreak || 0) % 7 === i && !isTodayDone;
                        return (
                          <div key={i} onClick={() => isCurrent && handleCheckIn()} className={`flex-1 min-w-[42px] aspect-square rounded-2xl flex items-center justify-center text-[10px] font-black border-2 transition-all ${isClaimed ? 'bg-blue-600 border-blue-600 text-white' : isCurrent ? 'bg-white border-blue-600 text-blue-600 animate-pulse' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {isClaimed ? <i className="ri-check-line"></i> : `+${r}`}
                          </div>
                        );
                      })}
                    </div>
                </section>

                {dynamicRewards.map((cat, idx) => (
                  <div key={idx} className="space-y-5 text-left">
                    <h3 className="text-[10px] font-black text-slate-800 tracking-[0.2em]">{cat.title}</h3>
                    <div className="flex overflow-x-auto no-scrollbar gap-5 pb-4">
                      {cat.items.map(item => (
                        <div key={item.id} onClick={() => setSelectedReward(item)} className="min-w-[180px] bg-white rounded-[35px] border border-slate-50 shadow-sm overflow-hidden active:scale-95 transition-all">
                          <img src={item.img} className="w-full h-32 object-cover" alt="item" />
                          <div className="p-5">
                            <h4 className="text-[10px] font-black text-slate-800 h-8 line-clamp-2">{item.name}</h4>
                            <span className="text-xs font-black text-blue-600">{item.cost.toLocaleString()} PTS</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'COLLECTION' && (
              <motion.div key="col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                 {user.collection?.length > 0 ? [...user.collection].reverse().map((item, i) => (
                    <div key={i} className="bg-slate-50 p-5 rounded-[25px] flex items-center gap-4 text-left border border-slate-100">
                       <img src={item.img} className="w-14 h-14 rounded-2xl object-cover" alt="c" />
                       <div className="flex-1 uppercase">
                         <p className="text-[10px] font-black text-slate-800">{item.name}</p>
                         <p className="text-[8px] font-bold text-blue-600 mt-1">STATUS: {item.status}</p>
                       </div>
                       <i className="ri-qr-code-line text-2xl text-slate-300"></i>
                    </div>
                 )) : <p className="py-20 text-[9px] font-black text-slate-300 text-center tracking-widest">BELUM ADA KOLEKSI</p>}
              </motion.div>
            )}

            {activeTab === 'SETTING' && (
              <motion.div key="set" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-left">
                <div className="bg-slate-50/50 p-6 rounded-[35px] border border-slate-50 space-y-6">
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 ml-1 tracking-widest">NAMA IDENTITAS</label>
                     <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value.toUpperCase()})} className="w-full h-14 bg-white rounded-[20px] px-6 text-[11px] font-black border border-slate-100 outline-none focus:border-blue-300 transition-colors" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 ml-1 tracking-widest">ALAMAT PENGIRIMAN</label>
                     <textarea value={editData.address} onChange={e => setEditData({...editData, address: e.target.value.toUpperCase()})} className="w-full h-32 bg-white rounded-[20px] p-6 text-[11px] font-black border border-slate-100 outline-none resize-none focus:border-blue-300 transition-colors" />
                   </div>
                </div>
                <button onClick={handleLogout} className="w-full py-5 border-2 border-red-50 text-red-500 rounded-[22px] text-[10px] font-black tracking-[0.2em] active:bg-red-50 transition-all flex items-center justify-center gap-3">
                  <i className="ri-logout-box-r-line text-lg"></i> KELUAR DARI AKUN
                </button>
              </motion.div>
            )}

            {activeTab === 'CARE' && (
              <motion.div key="car" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                 <div onClick={() => setShowBranches(true)} className="bg-white p-6 rounded-[30px] border border-slate-100 flex items-center justify-between shadow-sm cursor-pointer active:scale-95 transition-all">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 text-2xl"><i className="ri-whatsapp-line"></i></div>
                       <div className="text-left uppercase"><p className="text-[10px] font-black text-slate-800">WA CABANG</p></div>
                    </div><i className="ri-arrow-right-s-line text-slate-300"></i>
                 </div>
                 <div onClick={() => setShowConsultants(true)} className="bg-white p-6 rounded-[30px] border border-slate-100 flex items-center justify-between shadow-sm cursor-pointer active:scale-95 transition-all">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-2xl"><i className="ri-user-voice-line"></i></div>
                       <div className="text-left uppercase"><p className="text-[10px] font-black text-slate-800">KONSULTASI</p></div>
                    </div><i className="ri-arrow-right-s-line text-slate-300"></i>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {(showBranches || showConsultants || selectedReward) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowBranches(false); setShowConsultants(false); setSelectedReward(null); }} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 uppercase font-black">
            {showBranches && (
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-[45px] p-8 text-center">
                 <h3 className="text-xs font-black mb-6 tracking-widest">PILIH CABANG</h3>
                 <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
                    {dbBranches.map(b => (
                      <div key={b.id} onClick={() => window.open(`https://wa.me/${b.wa}`, '_blank')} className="p-5 bg-slate-50 rounded-[25px] flex justify-between items-center cursor-pointer active:scale-95 transition-all">
                        <div className="text-left leading-none"><p className="text-[10px] font-black">{b.name}</p></div>
                        <i className="ri-whatsapp-line text-green-500 text-xl"></i>
                      </div>
                    ))}
                 </div>
              </motion.div>
            )}

            {showConsultants && (
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-[45px] p-8 text-center">
                 <h3 className="text-xs font-black mb-6 tracking-widest">TENAGA AHLI</h3>
                 <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
                    {dbConsultants.map(c => (
                      <div key={c.id} onClick={() => window.open(`https://wa.me/${c.wa}`, '_blank')} className="p-4 bg-slate-50 rounded-[30px] flex items-center gap-4 cursor-pointer">
                        <img src={c.img} className="w-14 h-14 rounded-2xl object-cover" alt="c" />
                        <div className="text-left flex-1"><p className="text-[10px] font-black">{c.name}</p></div>
                        <i className="ri-chat-smile-3-line text-blue-500 text-xl"></i>
                      </div>
                    ))}
                 </div>
              </motion.div>
            )}

            {selectedReward && (
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-[45px] p-8 text-left font-black">
                <h3 className="text-xs font-black mb-4 tracking-widest uppercase">DETAIL HADIAH</h3>
                <img src={selectedReward.img} className="w-full h-44 object-cover rounded-[30px] mb-6 shadow-md" alt="r" />
                <div className="bg-slate-50 p-6 rounded-3xl mb-8 uppercase leading-relaxed"><p className="text-[10px] font-black text-slate-800 mb-2">{selectedReward.name}</p><p className="text-[8px] font-bold text-slate-500">{selectedReward.snk || 'S&K BERLAKU'}</p></div>
                <div className="flex gap-3"><button onClick={() => setSelectedReward(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px]">BATAL</button><button onClick={handleRedeem} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px]">TUKAR</button></div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
    </div>
  );
}