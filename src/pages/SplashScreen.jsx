import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onFinished }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Splash tampil selama 2 detik
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Tunggu animasi fade-out selesai sebelum menghapus komponen
      setTimeout(onFinished, 600); 
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-blue-600 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
      
      {/* BRANDING UTAMA */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-white text-3xl font-black tracking-tighter uppercase animate-pulse-soft">
          mega<span className="text-blue-200">utama</span>
        </h1>
        
        <p className="text-blue-100 text-[10px] font-bold tracking-[0.5em] uppercase mt-3 opacity-70">
          Web App Store
        </p>

        {/* LOADING BAR */}
        <div className="w-44 h-1 bg-blue-700/50 rounded-full overflow-hidden mt-10 shadow-inner">
          <div className="h-full bg-white w-full animate-loading-progress origin-left"></div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="pb-10 opacity-40">
        <p className="text-white text-[9px] font-bold uppercase tracking-[0.2em]">
          © mega utama 2026 | online division
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(0.98); }
        }
        @keyframes loading-progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
        .animate-loading-progress { animation: loading-progress 1.8s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
      `}} />
    </div>
  );
}