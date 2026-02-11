import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';

// --- IMPORT FIREBASE & CONTEXT ---
import { auth, db } from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { CartProvider } from './context/CartContext';

// --- IMPORT KOMPONEN GLOBAL ---
import MobileShell from './components/MobileShell'; 
import Navbar from './components/Navbar'; 
import ErrorBoundary from './components/ErrorBoundary';

// --- IMPORT PAGES ---
import SplashScreen from './pages/SplashScreen'; 
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Order from './pages/Order';
import OrderDetail from './pages/OrderDetail'; 
import Cart from './pages/Cart';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import AdminDashboard from './pages/AdminDashboard'; 
import AIChat from './pages/AIChat';
import NotFound from './pages/NotFound';

// --- KOMPONEN PEMBUNGKUS LAYOUT ---
const UserLayout = ({ children }) => {
  const location = useLocation();
  
  // Daftar path yang menyembunyikan Navbar
  const hideOnPaths = ['/cart', '/checkout', '/login', '/register', '/order/', '/success', '/room/', '/ai-chat'];
  const shouldHide = hideOnPaths.some(path => location.pathname.startsWith(path));

  // Daftar path tanpa padding bawah (full screen)
  const noPaddingPaths = ['/room/', '/checkout', '/cart', '/order/', '/ai-chat', '/admin'];
  const isNoPadding = noPaddingPaths.some(path => location.pathname.startsWith(path));

  return (
    <MobileShell>
      <div className="relative min-h-screen flex flex-col bg-white uppercase font-sans font-black">
        <main className={`flex-1 ${isNoPadding ? 'pb-0' : 'pb-32'}`}>
          {children}
        </main>
        {!shouldHide && <Navbar />}
      </div>
    </MobileShell>
  );
};

// --- KOMPONEN UTAMA APP ---
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(() => !sessionStorage.getItem('hasSeenSplash'));

  useEffect(() => {
    let unsubSnapshot = null;

    // Monitor status Login/Logout secara Real-time
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        unsubSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = { 
              ...docSnap.data(), 
              uid: firebaseUser.uid,
              email: firebaseUser.email 
            };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            const fallbackData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              role: 'Member'
            };
            setUser(fallbackData);
            localStorage.setItem('user', JSON.stringify(fallbackData));
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Snapshot Error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        localStorage.removeItem('user');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const handleSplashFinished = () => {
    sessionStorage.setItem('hasSeenSplash', 'true'); 
    setIsInitialLoading(false);
  };

  // Loading Screen saat aplikasi pertama kali dijalankan
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white uppercase font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em]">CONNECTING TO KOST.IN SERVER...</p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <CartProvider>
        {isInitialLoading && <SplashScreen onFinished={handleSplashFinished} />}

        <Router>
          <div className={`transition-opacity duration-700 ${isInitialLoading ? 'opacity-0' : 'opacity-100'}`}>
            <Routes>
              {/* ADMIN ROUTES - Hanya bisa diakses oleh user dengan role Admin */}
              <Route path="/admin" element={user && user.role === 'Admin' ? <AdminDashboard /> : <Navigate to="/login" replace />} />
              
              {/* PUBLIC & USER ROUTES */}
              <Route path="/" element={<UserLayout><Home /></UserLayout>} />
              <Route path="/room/:id" element={<UserLayout><ProductDetail /></UserLayout>} />
              <Route path="/cart" element={<UserLayout><Cart /></UserLayout>} />
              <Route path="/ai-chat" element={<UserLayout><AIChat /></UserLayout>} />

              {/* AUTH ROUTES */}
              <Route path="/register" element={!user ? <UserLayout><Register /></UserLayout> : <Navigate to="/" replace />} />
              <Route path="/login" element={!user ? <UserLayout><Login /></UserLayout> : <Navigate to="/" replace />} />
              
              {/* PROTECTED ROUTES - Harus Login */}
              <Route path="/profile" element={user ? <UserLayout><Profile /></UserLayout> : <Navigate to="/login" replace />} />
              <Route path="/checkout" element={user ? <UserLayout><Checkout /></UserLayout> : <Navigate to="/login" state={{ from: '/checkout' }} replace />} />
              <Route path="/order" element={user ? <UserLayout><Order /></UserLayout> : <Navigate to="/login" replace />} />
              <Route path="/order/:id" element={user ? <UserLayout><OrderDetail /></UserLayout> : <Navigate to="/login" replace />} />
              <Route path="/success" element={user ? <UserLayout><Success /></UserLayout> : <Navigate to="/login" replace />} />

              {/* 404 NOT FOUND */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </ErrorBoundary>
  );
}