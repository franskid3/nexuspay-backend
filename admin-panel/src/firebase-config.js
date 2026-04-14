import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvrlPme9_52tX29G2x2lmc6p5h1NAHwbg",
  authDomain: "rdif-payment-system.firebaseapp.com",
  projectId: "rdif-payment-system",
  storageBucket: "rdif-payment-system.firebasestorage.app",
  messagingSenderId: "7483659767",
  appId: "1:7483659767:web:2d71cc5f4870d284e04af2",
  measurementId: "G-HPQWXH7DBX"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
export const db = getFirestore(app);
export default app;