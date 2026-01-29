import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRYOLRLs9t_2FbHNB7V98Keri_2KVlc2E",
  authDomain: "kost-in-b6877.firebaseapp.com",
  projectId: "kost-in-b6877",
  storageBucket: "kost-in-b6877.firebasestorage.app",
  messagingSenderId: "488804024218",
  appId: "1:488804024218:web:afeb2e611c15c6d5754423",
  measurementId: "G-S3PTZRCHCK"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor layanan agar bisa dipakai di file lain
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});