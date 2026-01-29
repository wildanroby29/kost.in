import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SATPAM LOG:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          textTransform: 'uppercase'
        }}>
          {/* ICON PREMIUM SESUAI SEBELUMNYA */}
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#FFFFFF',
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 15px 20px -5px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E2E8F0'
          }}>
            <span style={{ fontSize: '32px' }}>🛠️</span>
          </div>

          <h1 style={{
            fontSize: '15px', // FONT DIPERKECIL
            fontWeight: '900',
            color: '#0F172A',
            letterSpacing: '1px',
            marginBottom: '8px'
          }}>
            SISTEM SEDANG DIPERBAIKI
          </h1>

          <p style={{
            fontSize: '10px', // FONT DIPERKECIL
            fontWeight: '700',
            color: '#64748B',
            maxWidth: '250px',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            MAAF ATAS KETIDAKNYAMANAN INI, KAMI SEDANG MENGOPTIMALKAN LAYANAN KEMBALI.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#2563EB', // WARNA BIRU SEBELUMNYA
              color: 'white',
              border: 'none',
              padding: '14px 30px',
              borderRadius: '16px',
              fontSize: '11px', // FONT DIPERKECIL
              fontWeight: '900',
              cursor: 'pointer',
              boxShadow: '0 8px 12px -3px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.5px'
            }}
          >
            MUAT ULANG HALAMAN
          </button>

          <div style={{
            marginTop: '40px',
            fontSize: '9px', // FONT DIPERKECIL
            fontWeight: '800',
            color: '#CBD5E1',
            letterSpacing: '2px'
          }}>
            MEGA UTAMA GROUP • 2026
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;