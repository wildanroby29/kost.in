import React, { createContext, useContext, useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

const CartContext = createContext();

export function CartProvider({ children }) {
  // Ambil data awal dari localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      return [];
    }
  });

  // Simpan ke localStorage otomatis setiap ada perubahan
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    if (!product || !product.id) return;
    setCart((prev) => {
      const currentCart = Array.isArray(prev) ? prev : [];
      const existing = currentCart.find((item) => item.id === product.id);
      
      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id 
            ? { ...item, quantity: (item.quantity || 1) + 1 } 
            : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, qty) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, qty) } : item
      )
    );
  };

  // --- PERBAIKAN VITAL: CLEAR CART SINKRON KE FIREBASE ---
  const clearCart = async () => {
    // 1. Kosongkan state di UI
    setCart([]);
    
    // 2. Kosongkan localStorage
    localStorage.removeItem('cart');

    // 3. Kosongkan di database Firebase (Biar tidak muncul lagi)
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { cart: [] });
        console.log("Database Keranjang Dibersihkan");
      } catch (err) {
        console.error("Gagal hapus database:", err);
      }
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};