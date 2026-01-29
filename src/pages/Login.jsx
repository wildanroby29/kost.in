import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'; // Tambah signInWithEmailAndPassword
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tentukan ke mana user pergi setelah login berhasil
  const from = location.state?.from || "/";

  // --- FUNGSI LOGIN GOOGLE (SUDAH DIPERBAIKI) ---
  const loginWithGoogle = async () => {
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Cek apakah data user sudah ada di Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let userData;

      if (userSnap.exists()) {
        // Jika user lama, ambil data aslinya (Poin lama terjaga)
        userData = userSnap.data();
      } else {
        // Jika user baru, buat data baru dengan poin default
        userData = {
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL,
          uid: user.uid,
          isLoggedIn: true,
          points: 1417, 
          role: 'Member',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, userData);
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      new BroadcastChannel('auth_channel').postMessage('login');
      navigate(from, { replace: true });

    } catch (err) {
      console.error("Error Google Login:", err);
      alert("GAGAL LOGIN VIA GOOGLE");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNGSI LOGIN MANUAL (REAL FIREBASE AUTH) ---
  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("ISI DATA LENGKAP.");
    
    setIsSubmitting(true);
    try {
      // 1. Login ke Firebase Auth
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // 2. Ambil detail user dari Firestore (untuk ambil Poin, Role, dll)
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let userData;

      if (userSnap.exists()) {
        userData = userSnap.data();
      } else {
        // Fallback jika data di Firestore belum ada
        userData = {
          name: email.split('@')[0].toUpperCase(),
          email: user.email,
          uid: user.uid,
          isLoggedIn: true,
          points: 1417,
          role: 'Member'
        };
      }
      
      // 3. Simpan ke LocalStorage & Sinkronisasi
      localStorage.setItem('user', JSON.stringify(userData));
      new BroadcastChannel('auth_channel').postMessage('login');
      
      navigate(from, { replace: true });

    } catch (err) {
      console.error("Error Manual Login:", err);
      // Handle error spesifik agar terlihat pro
      if (err.code === 'auth/user-not-found') alert("EMAIL TIDAK TERDAFTAR");
      else if (err.code === 'auth/wrong-password') alert("KATA SANDI SALAH");
      else if (err.code === 'auth/invalid-credential') alert("EMAIL ATAU PASSWORD SALAH");
      else alert("GAGAL MASUK: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] flex flex-col px-8 pt-28 pb-12 max-w-md mx-auto font-sans antialiased uppercase">
      <div className="flex-1">
        <header className="mb-12">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter">MASUK</h2>
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] mt-2">AKSES AKUN ANDA SEKARANG</p>
        </header>

        <form onSubmit={handleManualLogin} className="space-y-8">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] ml-1 mb-3 block">ALAMAT EMAIL</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)} 
                className="w-full bg-white border border-slate-100 rounded-[22px] px-7 py-5 shadow-sm focus:border-blue-600/10 transition-all outline-none text-sm font-semibold" 
                placeholder="NAMA@EMAIL.COM" 
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className="text-[11px] font-bold text-slate-400 tracking-[0.2em] ml-1 mb-3 block">KATA SANDI</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)} 
                className="w-full bg-white border border-slate-100 rounded-[22px] px-7 py-5 shadow-sm focus:border-blue-600/10 transition-all outline-none text-sm font-semibold" 
                placeholder="••••••••" 
              />
            </motion.div>
          </div>

          <div className="space-y-4 pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white rounded-[26px] text-[14px] font-bold tracking-widest active:scale-[0.96] transition-all shadow-xl shadow-blue-100 flex justify-center items-center h-[64px]">
              {isSubmitting ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'MASUK KE AKUN'}
            </button>

            <div className="relative py-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center px-4"><div className="w-full border-t border-slate-100"></div></div>
              <span className="relative bg-[#F9FBFC] px-4 text-[10px] font-bold text-slate-300 tracking-[0.3em]">ATAU</span>
            </div>

            <button type="button" onClick={loginWithGoogle} className="w-full bg-white border border-slate-100 rounded-[26px] shadow-sm flex items-center justify-center gap-4 active:scale-[0.96] transition-all h-[64px]">
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-6 h-6" alt="google" />
              <span className="text-[13px] font-bold text-slate-600 tracking-wider uppercase">MASUK VIA GOOGLE</span>
            </button>
          </div>
        </form>
      </div>

      <div className="mt-12 text-center">
        <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">
          BELUM PUNYA AKUN? <Link to="/register" className="text-blue-600 ml-1 underline underline-offset-4">DAFTAR SEKARANG</Link>
        </p>
      </div>
    </div>
  );
}