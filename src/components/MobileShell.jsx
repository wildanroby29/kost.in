import React from 'react';

export default function MobileShell({ children }) {
  return (
    // Latar belakang abu-abu di desktop
    <div className="bg-slate-100 min-h-screen w-full flex justify-center"> 
      
      {/* Bingkai HP */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col border-x border-slate-200">
        
        {/* Area Konten */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </div>

      </div>
    </div>
  );
}