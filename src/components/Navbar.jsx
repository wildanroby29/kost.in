import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- FIREBASE IMPORT ---
import { db, auth } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [isBumping, setIsBumping] = useState(false);

  // Wildan: Ayeuna urang make onSnapshot meh sinkron terus jeung Cloud
  useEffect(() => {
    let unsubCart = () => {};

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Mun user login, dengekeun parobahan field 'cart' di Firestore
        const userRef = doc(db, "users", user.uid);
        unsubCart = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const cartData = snapshot.data().cart || [];
            const total = cartData.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
            
            // Efek bump mun jumlahna robah
            if (total !== cartCount) {
              setCartCount(total);
              setIsBumping(true);
              setTimeout(() => setIsBumping(false), 300);
            }
          }
        });
      } else {
        // Mun logout, reset jadi 0
        setCartCount(0);
      }
    });

    // Cleanup pas komponen di-unmount
    return () => {
      unsubscribeAuth();
      unsubCart();
    };
  }, [cartCount]);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
      <nav className="bg-blue-600 border border-white/20 rounded-[24px] py-3.5 px-8 flex justify-between items-center shadow-[0_20px_50px_rgba(37,99,235,0.3)] w-[310px] pointer-events-auto antialiased">
        
        {/* HOME */}
        <button onClick={() => navigate('/')} className={`relative transition-all duration-300 ${isActive('/') ? 'text-white' : 'text-blue-100/50'}`}>
          <motion.i animate={isActive('/') ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }} className="ri-home-5-fill text-xl block" />
          {isActive('/') && <motion.div layoutId="navDot" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
        </button>
        
        {/* CART */}
        <button onClick={() => navigate('/cart')} className={`relative transition-all duration-300 ${isActive('/cart') ? 'text-white' : 'text-blue-100/50'}`}>
          <motion.i 
            animate={isBumping ? { scale: [1, 1.4, 1] } : isActive('/cart') ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }} 
            className="ri-shopping-basket-2-line text-xl block" 
          />
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                exit={{ scale: 0 }} 
                key={cartCount}
                className="absolute -top-2 -right-2 bg-white text-blue-600 text-[10px] font-black w-4 h-4 rounded-lg flex items-center justify-center shadow-lg"
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
          {isActive('/cart') && <motion.div layoutId="navDot" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
        </button>

        {/* ORDER */}
        <button onClick={() => navigate('/order')} className={`relative transition-all duration-300 ${isActive('/order') ? 'text-white' : 'text-blue-100/50'}`}>
          <motion.i animate={isActive('/order') ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }} className="ri-bill-line text-xl block" />
          {isActive('/order') && <motion.div layoutId="navDot" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
        </button>

        {/* PROFILE */}
        <button onClick={() => navigate('/profile')} className={`relative transition-all duration-300 ${isActive('/profile') ? 'text-white' : 'text-blue-100/50'}`}>
          <motion.i animate={isActive('/profile') ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }} className="ri-user-3-fill text-xl block" />
          {isActive('/profile') && <motion.div layoutId="navDot" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />}
        </button>

      </nav>
    </div>
  );
}