import React from 'react';
import { useNavigate } from 'react-router-dom';
// IMPORT ICON LUCIDE (PASTIKAN SUDAH NPM INSTALL LUCIDE-REACT)
import { Compass } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '30px', 
      backgroundColor: '#F9FAFB',
      textAlign: 'center', 
      fontFamily: 'sans-serif',
      textTransform: 'uppercase' 
    }}>
      {/* ICON TANPA KOTAK BORDER - CLEAN STYLE */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Compass 
          size={56} 
          color="#CBD5E1" 
          strokeWidth={1.2} 
        />
      </div>

      {/* HIRARKI VISUAL: JUDUL BOLD, DESKRIPSI REGULER */}
      <h1 style={{ 
        fontSize: '14px', 
        fontWeight: '900', 
        color: '#0F172A', 
        letterSpacing: '1.5px',
        marginBottom: '10px' 
      }}>
        Halaman Tidak Ditemukan
      </h1>

      <p style={{ 
        fontSize: '10px', 
        fontWeight: '400', 
        color: '#64748B', 
        maxWidth: '220px',
        lineHeight: '1.6',
        marginBottom: '35px',
        letterSpacing: '0.5px'
      }}>
        MAAF, HALAMAN YANG ANDA CARI TIDAK TERSEDIA ATAU TELAH BERPINDAH KE LOKASI LAIN.
      </p>

      {/* WARNA TOMBOL SESUAI APP (#2563EB) */}
      <button 
        onClick={() => navigate('/')}
        style={{
          padding: '14px 32px',
          backgroundColor: '#2563EB', 
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          fontSize: '10px',
          fontWeight: '900',
          letterSpacing: '1px',
          boxShadow: '0 8px 12px -3px rgba(37, 99, 235, 0.3)',
          transition: 'all 0.2s ease'
        }}
      >
        KEMBALI KE BERANDA
      </button>

      {/* FOOTER MINIMALIS */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        fontSize: '8px',
        fontWeight: '800',
        color: '#CBD5E1',
        letterSpacing: '2px'
      }}>
        MEGA UTAMA GROUP • TECHNICAL SUPPORT
      </div>
    </div>
  );
};

export default NotFound;