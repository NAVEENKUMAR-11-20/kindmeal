import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAvOiRBJl45X3O_rQU3XdAAOfPvBdd214U",
  authDomain: "kindmeal-d05a0.firebaseapp.com",
  projectId: "kindmeal-d05a0",
  storageBucket: "kindmeal-d05a0.firebasestorage.app",
  messagingSenderId: "82516959075",
  appId: "1:82516959075:web:e4f7c8e2c2ee4336947d56",
  measurementId: "G-57FBBKDV4V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
