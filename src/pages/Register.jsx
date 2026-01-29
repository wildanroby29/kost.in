import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase'; // Import auth dan db
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // Fungsi asli Firebase
import { doc, setDoc } from 'firebase/firestore'; // Fungsi simpan database

export default function Register() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '' 
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.password) {
      alert("MOHON LENGKAPI DATA PENDAFTARAN ANDA.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. BUAT AKUN DI FIREBASE AUTH
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // 2. UPDATE NAMA DI PROFIL AUTH
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      await updateProfile(user, {
        displayName: fullName,
        photoURL: `https://ui-avatars.com/api/?name=${formData.firstName}&background=2563eb&color=fff`
      });

      // 3. SIMPAN DATA LENGKAP KE FIRESTORE (POIN 1417)
      const userData = { 
        uid: user.uid,
        name: fullName, 
        email: formData.email, 
        avatar: `https://ui-avatars.com/api/?name=${formData.firstName}&background=2563eb&color=fff`, 
        isLoggedIn: true,
        points: 1417, // Poin hadiah pendaftaran
        role: 'Member',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", user.uid), userData);

      // 4. SIMPAN KE LOCAL STORAGE & BROADCAST
      localStorage.setItem('user', JSON.stringify(userData));
      new BroadcastChannel('auth_channel').postMessage('login');
      
      navigate('/');
    } catch (err) {
      console.error("Error Register:", err);
      // Handle error agar pro
      if (err.code === 'auth/email-already-in-white') alert("EMAIL SUDAH TERDAFTAR");
      else if (err.code === 'auth/weak-password') alert("KATA SANDI TERLALU LEMAH (MIN. 6 KARAKTER)");
      else alert("GAGAL MENDAFTAR: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] flex flex-col px-8 pt-16 pb-12 max-w-md mx-auto font-sans antialiased">
      
      <div className="flex-1 flex flex-col justify-center">
        <form onSubmit={handleRegister} className="space-y-7">
          
          {/* Row Nama Depan & Belakang */}
          <div className="grid grid-cols-2 gap-4" style={{ animation: 'fadeInUp 0.4s ease-out forwards' }}>
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Nama Depan</label>
              <input 
                type="text" 
                placeholder="WILDAN" 
                onChange={(e)=>setFormData({...formData, firstName: e.target.value})} 
                className="w-full bg-white border border-slate-100 rounded-[22px] px-6 py-5 text-[15px] font-semibold shadow-sm outline-none focus:border-blue-600/20 focus:ring-4 focus:ring-blue-600/5 transition-all uppercase" 
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Nama Belakang</label>
              <input 
                type="text" 
                placeholder="SAPUTRA" 
                onChange={(e)=>setFormData({...formData, lastName: e.target.value})} 
                className="w-full bg-white border border-slate-100 rounded-[22px] px-6 py-5 text-[15px] font-semibold shadow-sm outline-none focus:border-blue-600/20 focus:ring-4 focus:ring-blue-600/5 transition-all uppercase" 
              />
            </div>
          </div>

          {/* Email Field */}
          <div style={{ animation: 'fadeInUp 0.5s ease-out forwards' }} className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Alamat Email</label>
            <input 
              type="email" 
              placeholder="NAMA@EMAIL.COM" 
              onChange={(e)=>setFormData({...formData, email: e.target.value})} 
              className="w-full bg-white border border-slate-100 rounded-[22px] px-7 py-5 text-[15px] font-semibold shadow-sm outline-none focus:border-blue-600/20 focus:ring-4 focus:ring-blue-600/5 transition-all uppercase" 
            />
          </div>

          {/* Password Field */}
          <div style={{ animation: 'fadeInUp 0.6s ease-out forwards' }} className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] ml-1">Kata Sandi</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              onChange={(e)=>setFormData({...formData, password: e.target.value})} 
              className="w-full bg-white border border-slate-100 rounded-[22px] px-7 py-5 text-[15px] font-semibold shadow-sm outline-none focus:border-blue-600/20 focus:ring-4 focus:ring-blue-600/5 transition-all" 
            />
          </div>

          {/* TOMBOL DAFTAR */}
          <div className="pt-6" style={{ animation: 'fadeInUp 0.7s ease-out forwards' }}>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full bg-blue-600 text-white rounded-[28px] text-[15px] font-bold uppercase tracking-[0.1em] active:scale-[0.96] transition-all shadow-2xl shadow-blue-200 flex justify-center items-center h-[72px]"
            >
              {isSubmitting ? (
                <div className="w-7 h-7 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : 'BUAT AKUN SEKARANG'}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Link */}
      <div className="mt-12 text-center" style={{ animation: 'fadeIn 1s ease-out forwards' }}>
        <p className="text-[15px] text-slate-400 font-medium uppercase tracking-tight">
          Sudah punya akun? 
          <Link to="/login" className="text-blue-600 font-bold ml-1.5 hover:underline underline-offset-4">Masuk</Link>
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(25px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}