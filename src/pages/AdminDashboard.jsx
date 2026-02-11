import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase'; 
import { 
  collection, doc, onSnapshot, updateDoc, deleteDoc, 
  addDoc, setDoc, query, orderBy 
} from 'firebase/firestore';

export default function AdminWildanOS() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [branches, setBranches] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // --- SEMUA FORM STATE LENGKAP ---
  const [rewardForm, setRewardForm] = useState({ 
    name: '', cost: '', image: '', category: 'HADIAH FISIK', stock: '', description: '' 
  });
  const [branchForm, setBranchForm] = useState({ 
    name: '', city: '', wa: '', mapUrl: '' 
  });
  const [consForm, setConsForm] = useState({ 
    name: '', role: '', wa: '' 
  });
  const [appConfig, setAppConfig] = useState({ 
    waCS: '', promoBannerUrl: '', maintenance: false, broadcastMessage: '', pointValue: 1 
  });

  // --- 1. REAL-TIME DATA SYNC (DATABASE CORE) ---
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const allOrders = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        displayUser: d.data().userName || d.data().userEmail || "GUEST",
        displayItem: d.data().name || d.data().itemName || "PRODUK",
        displayCost: Number(d.data().cost || d.data().total) || 0,
        status: d.data().status || "PENDING"
      }));
      setOrders(allOrders.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)));
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        poin: Number(d.data().poin || d.data().points) || 0,
        photo: d.data().photoURL || d.data().avatar || `https://ui-avatars.com/api/?name=${d.data().email || 'U'}&background=0D8ABC&color=fff`
      })));
    });

    const unsubRewards = onSnapshot(collection(db, "rewards"), (s) => setRewards(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubBranches = onSnapshot(collection(db, "branches"), (s) => setBranches(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubCons = onSnapshot(collection(db, "consultants"), (s) => setConsultants(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubConfig = onSnapshot(doc(db, "settings", "app_config"), (d) => { if(d.exists()) setAppConfig(d.data()); });

    return () => { 
      unsubOrders(); unsubUsers(); unsubRewards(); 
      unsubBranches(); unsubCons(); unsubConfig(); 
    };
  }, []);

  // --- 2. LOGIC ANALYTICS ---
  const stats = useMemo(() => {
    const totalPointsRedeemed = orders.reduce((acc, curr) => acc + curr.displayCost, 0);
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    return { totalPointsRedeemed, pendingCount, totalUsers: users.length };
  }, [orders, users]);

  // --- 3. CORE FUNCTIONS ---
  const handlePesanKurir = async (order) => {
    if(!window.confirm("PESAN KURIR SEKARANG?")) return;
    try {
      const response = await fetch('/api/create-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });
      const res = await response.json();
      if(res.success) alert("RESI: " + res.waybill_id);
      else alert("ERROR: " + res.message);
    } catch (e) { alert("SYSTEM ERROR"); }
  };

  const handleOrderStatus = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
    alert("STATUS UPDATED TO: " + status);
  };

  const deleteData = async (col, id) => {
    if(window.confirm("HAPUS DATA INI PERMANEN?")) await deleteDoc(doc(db, col, id));
  };

  const saveCollectionData = async (col, data, setForm, initialForm) => {
    if(!data.name) return alert("NAMA WAJIB DIISI!");
    await addDoc(collection(db, col), { 
      ...data, 
      cost: data.cost ? Number(data.cost) : 0,
      img: data.image || '', 
      createdAt: new Date().toISOString() 
    });
    setForm(initialForm);
    alert("DATA BERHASIL DISIMPAN KE " + col.toUpperCase());
  };

  const adjustPoin = async (uid, current) => {
    const val = prompt("EDIT SALDO POIN USER:", current);
    if(val !== null && !isNaN(val)) {
      await updateDoc(doc(db, "users", uid), { poin: Number(val) });
    }
  };

  const deployConfig = async () => {
    await setDoc(doc(db, "settings", "app_config"), appConfig);
    alert("SYSTEM CONFIG DEPLOYED!");
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black text-blue-600 tracking-widest uppercase">WildanOS Loading System...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex font-sans uppercase font-black overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-24 bg-[#0A0A0A] border-r border-white/5 flex flex-col items-center py-12 gap-8 shrink-0">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 text-xl font-black">W</div>
        <nav className="flex flex-col gap-8 text-slate-600">
          <button onClick={() => setActiveTab('DASHBOARD')} className={activeTab === 'DASHBOARD' ? 'text-blue-600' : 'hover:text-white'}><i className="ri-dashboard-fill text-2xl"></i></button>
          <button onClick={() => setActiveTab('REWARDS')} className={activeTab === 'REWARDS' ? 'text-blue-600' : 'hover:text-white'}><i className="ri-gift-fill text-2xl"></i></button>
          <button onClick={() => setActiveTab('MARKET')} className={activeTab === 'MARKET' ? 'text-blue-600' : 'hover:text-white'}><i className="ri-map-pin-user-fill text-2xl"></i></button>
          <button onClick={() => setActiveTab('USERS')} className={activeTab === 'USERS' ? 'text-blue-600' : 'hover:text-white'}><i className="ri-group-fill text-2xl"></i></button>
          <button onClick={() => setActiveTab('SYSTEM')} className={activeTab === 'SYSTEM' ? 'text-blue-600' : 'hover:text-white'}><i className="ri-settings-fill text-2xl"></i></button>
        </nav>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-start mb-16">
          <div>
            <h1 className="text-5xl tracking-tighter font-black uppercase">ADMIN <span className="text-blue-600">PRO</span></h1>
            <p className="text-[10px] text-slate-500 tracking-[0.5em] mt-2 font-black">WILDANOS V7.0 CORE TERMINAL</p>
          </div>
          <input 
            type="text" placeholder="CARI DATABASE..." 
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0A0A0A] border border-white/10 px-8 py-4 rounded-2xl text-[10px] w-80 outline-none focus:border-blue-600 font-black"
          />
        </header>

        <AnimatePresence mode="wait">
          
          {activeTab === 'DASHBOARD' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-white/5">
                  <p className="text-[10px] text-slate-500 mb-2">POIN TERPAKAI</p>
                  <h2 className="text-3xl text-orange-500 font-black">{stats.totalPointsRedeemed.toLocaleString()} PTS</h2>
                </div>
                <div className="bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-white/5">
                  <p className="text-[10px] text-slate-500 mb-2">PESANAN PENDING</p>
                  <h2 className="text-3xl text-yellow-500 font-black">{stats.pendingCount} REQS</h2>
                </div>
                <div className="bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-white/5 shadow-lg shadow-blue-600/10">
                  <p className="text-[10px] text-slate-500 mb-2">TOTAL PENGGUNA</p>
                  <h2 className="text-3xl text-blue-500 font-black">{stats.totalUsers} USERS</h2>
                </div>
              </div>

              <div className="bg-[#0A0A0A] rounded-[2rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-white/5 text-slate-500 font-black">
                    <tr><th className="p-6">MEMBER / ALAMAT</th><th className="p-6">HADIAH</th><th className="p-6">STATUS</th><th className="p-6 text-right">ACTION</th></tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => o.displayUser.includes(search.toUpperCase())).map(o => (
                      <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                        <td className="p-6">
                          <p className="font-black text-white">{o.displayUser}</p>
                          <p className="text-[9px] text-slate-500 lowercase">{o.address || 'Alamat tidak diisi'}</p>
                          {o.resi && <p className="text-green-500 text-[9px] font-black mt-1 tracking-widest">RESI: {o.resi}</p>}
                        </td>
                        <td className="p-6">
                          <p className="text-blue-400 font-black">{o.displayItem}</p>
                          <p className="text-[9px] text-orange-500">{o.displayCost.toLocaleString()} PTS</p>
                        </td>
                        <td className="p-6">
                           <span className={`px-3 py-1 rounded-full text-[8px] font-black ${o.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-6 text-right flex justify-end gap-3">
                          {!o.resi && o.status !== 'PENDING' && (
                            <button onClick={() => handlePesanKurir(o)} className="bg-orange-600 px-4 py-2 rounded-xl text-[9px] font-black">PESAN KURIR</button>
                          )}
                          <button onClick={() => handleOrderStatus(o.id, 'PROSES')} className="bg-blue-600 px-4 py-2 rounded-xl text-[9px] font-black">PROSES</button>
                          <button onClick={() => handleOrderStatus(o.id, 'SELESAI')} className="bg-green-600 px-4 py-2 rounded-xl text-[9px] font-black">SELESAI</button>
                          <button onClick={() => deleteData('orders', o.id)} className="bg-red-600/20 text-red-500 px-4 py-2 rounded-xl text-[9px] font-black">HAPUS</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'REWARDS' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-12 gap-8">
              <div className="col-span-5 bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-white/5 space-y-5">
                <h3 className="text-blue-600 text-xl font-black mb-4">TAMBAH HADIAH</h3>
                <input placeholder="NAMA ITEM" value={rewardForm.name} onChange={e=>setRewardForm({...rewardForm, name: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="HARGA POIN" value={rewardForm.cost} onChange={e=>setRewardForm({...rewardForm, cost: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                  <input type="number" placeholder="STOK" value={rewardForm.stock} onChange={e=>setRewardForm({...rewardForm, stock: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                </div>
                <select value={rewardForm.category} onChange={e=>setRewardForm({...rewardForm, category: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black outline-none text-white">
                  <option value="HADIAH FISIK">HADIAH FISIK</option>
                  <option value="PROMO & VOUCHER">PROMO & VOUCHER</option>
                </select>
                <input placeholder="URL FOTO PRODUK" value={rewardForm.image} onChange={e=>setRewardForm({...rewardForm, image: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <textarea placeholder="DESKRIPSI HADIAH" value={rewardForm.description} onChange={e=>setRewardForm({...rewardForm, description: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] h-32 font-black" />
                <button onClick={() => saveCollectionData('rewards', rewardForm, setRewardForm, {name:'', cost:'', image:'', category:'HADIAH FISIK', stock:'', description:''})} className="w-full bg-blue-600 py-6 rounded-2xl font-black text-[11px]">PUBLISH KE KATALOG</button>
              </div>
              <div className="col-span-7 grid grid-cols-2 gap-4 h-[700px] overflow-y-auto pr-2">
                {rewards.map(r => (
                  <div key={r.id} className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[2rem] relative group">
                    <img src={r.img || r.image} className="w-full h-32 object-cover rounded-2xl mb-4 bg-white/5" alt="IMG" />
                    <h4 className="text-[11px] font-black leading-tight">{r.name}</h4>
                    <p className="text-blue-500 text-[10px] mt-1 font-black">{r.cost} PTS • {r.category}</p>
                    <button onClick={() => deleteData('rewards', r.id)} className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="ri-delete-bin-7-fill text-xl"></i></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'MARKET' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-10">
              <div className="bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-white/5 space-y-5">
                <h3 className="text-blue-600 font-black mb-4">CABANG TOKO</h3>
                <input placeholder="NAMA CABANG" value={branchForm.name} onChange={e=>setBranchForm({...branchForm, name: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <input placeholder="KOTA" value={branchForm.city} onChange={e=>setBranchForm({...branchForm, city: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <input placeholder="WHATSAPP (62...)" value={branchForm.wa} onChange={e=>setBranchForm({...branchForm, wa: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <button onClick={() => saveCollectionData('branches', branchForm, setBranchForm, {name:'', city:'', wa:'', mapUrl:''})} className="w-full bg-white text-black py-5 rounded-2xl font-black text-[11px]">TAMBAH CABANG</button>
                <div className="mt-8 space-y-2">
                  {branches.map(b => (
                    <div key={b.id} className="flex justify-between p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-black">
                      <span>{b.name} - {b.city}</span>
                      <button onClick={() => deleteData('branches', b.id)} className="text-red-500">HAPUS</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-white/5 space-y-5">
                <h3 className="text-blue-600 font-black mb-4">TIM KONSULTAN</h3>
                <input placeholder="NAMA KONSULTAN" value={consForm.name} onChange={e=>setConsForm({...consForm, name: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <input placeholder="SPESIALIS / ROLE" value={consForm.role} onChange={e=>setConsForm({...consForm, role: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <input placeholder="WA AKTIF" value={consForm.wa} onChange={e=>setConsForm({...consForm, wa: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                <button onClick={() => saveCollectionData('consultants', consForm, setConsForm, {name:'', role:'', wa:''})} className="w-full bg-white text-black py-5 rounded-2xl font-black text-[11px]">TAMBAH KONSULTAN</button>
                <div className="mt-8 space-y-2">
                  {consultants.map(c => (
                    <div key={c.id} className="flex justify-between p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-black">
                      <span>{c.name} ({c.role})</span>
                      <button onClick={() => deleteData('consultants', c.id)} className="text-red-500">HAPUS</button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'USERS' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white/5 text-slate-500 font-black">
                  <tr><th className="p-8">AVATAR</th><th className="p-8">EMAIL ADDRESS</th><th className="p-8">POIN SALDO</th><th className="p-8 text-right">ACTION</th></tr>
                </thead>
                <tbody>
                  {users.filter(u => u.email?.toUpperCase().includes(search.toUpperCase())).map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                      <td className="p-8">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10">
                          <img src={u.photo} alt="AVATAR" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-8 font-black text-slate-300">{u.email || "NO-EMAIL@DATA.COM"}</td>
                      <td className="p-8 font-black text-blue-500 text-xl">{u.poin.toLocaleString()} PTS</td>
                      <td className="p-8 text-right">
                        <button onClick={() => adjustPoin(u.id, u.poin)} className="bg-blue-600/10 text-blue-600 px-6 py-3 rounded-2xl font-black text-[9px] hover:bg-blue-600 hover:text-white transition-all">EDIT POIN</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'SYSTEM' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl bg-[#0A0A0A] p-12 rounded-[3rem] border border-white/5 space-y-8">
              <h3 className="text-blue-600 font-black">SYSTEM CONTROL CENTER</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-[9px] text-slate-500 mb-2 font-black">LINK GAMBAR PROMO BANNER</p>
                  <input value={appConfig.promoBannerUrl} onChange={e=>setAppConfig({...appConfig, promoBannerUrl: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] font-black" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 mb-2 font-black">BROADCAST MESSAGE</p>
                  <textarea value={appConfig.broadcastMessage} onChange={e=>setAppConfig({...appConfig, broadcastMessage: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-[10px] h-24 font-black" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-[9px] text-slate-500 mb-4 font-black">MAINTENANCE MODE</p>
                    <input type="checkbox" checked={appConfig.maintenance} onChange={e=>setAppConfig({...appConfig, maintenance: e.target.checked})} className="w-8 h-8 accent-blue-600 cursor-pointer" />
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-[9px] text-slate-500 mb-4 font-black">WA CS CENTER</p>
                    <input value={appConfig.waCS} onChange={e=>setAppConfig({...appConfig, waCS: e.target.value})} className="w-full bg-transparent border-b border-white/10 text-[10px] outline-none" />
                  </div>
                </div>
                <button onClick={deployConfig} className="w-full bg-blue-600 py-6 rounded-3xl font-black text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all">DEPLOY UPDATES</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
    </div>
  );
}