// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";
import { getFirestore} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBmzNwcMbklW88jbOv6QDGEyGuU7CpV0yo",
  authDomain: "fyp22-tme.firebaseapp.com",
  projectId: "fyp22-tme",
  storageBucket: "fyp22-tme.firebasestorage.app",
  messagingSenderId: "582833045836",
  appId: "1:582833045836:web:e0cff318d08e5758d38fe9",
  measurementId: "G-T8ZJ6JF6X5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;