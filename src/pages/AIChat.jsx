import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { id: 1, text: "HALO! SAYA ASISTEN AI MEGA UTAMA. ADA YANG BISA SAYA BANTU HARI INI?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // Auto scroll ke bawah
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim().toUpperCase();
    const userMsg = { id: Date.now(), text: userText, sender: 'user' };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await axios.post('/api/gemini', {
        message: userText,
        history: messages.slice(-4).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }))
      });

      if (response.data && response.data.success) {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: response.data.text.toUpperCase(), 
          sender: 'ai' 
        }]);
      } else {
        throw new Error("GAGAL AMBIL RESPON");
      }

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 2, 
        text: "ADUH BOS, KONEKSI LAGI REWEL NIH. COBA LAGI BENTAR YA!", 
        sender: 'ai' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9FBFC] font-sans font-black uppercase overflow-hidden">
      {/* HEADER */}
      <header className="px-6 py-6 bg-white border-b border-slate-100 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
          <i className="ri-arrow-left-line text-xl"></i>
        </button>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-none tracking-tight">AI MEGA UTAMA</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest">ONLINE & PINTAR</p>
          </div>
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] px-5 py-4 rounded-[24px] text-[11px] leading-relaxed shadow-sm font-black 
              ${msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none shadow-blue-100' 
                : 'bg-white text-slate-700 rounded-bl-none border border-slate-50'}`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-5 py-4 rounded-[24px] rounded-bl-none border border-slate-50 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-6 bg-white border-t border-slate-100 pb-10">
        <form onSubmit={handleSend} className="flex gap-3 max-w-md mx-auto">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="TANYA SOAL CAT..." 
            className="flex-1 bg-slate-50 px-5 py-4 rounded-2xl text-[11px] font-bold outline-none border border-transparent focus:border-blue-100 uppercase" 
          />
          <button 
            type="submit" 
            disabled={isTyping} 
            className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-90 disabled:bg-slate-300 transition-all"
          >
            <i className={isTyping ? "ri-loader-4-line animate-spin text-xl" : "ri-send-plane-2-fill text-xl"}></i>
          </button>
        </form>
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}