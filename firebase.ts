import { getFirestore } from "firebase/firestore";
import * as firebaseApp from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAu7UMwYdwMWs12NoEn0ICvrNDVAu2wrug",
  authDomain: "fazarah-5182e.firebaseapp.com",
  projectId: "fazarah-5182e",
  storageBucket: "fazarah-5182e.firebasestorage.app",
  messagingSenderId: "437928741348",
  appId: "1:437928741348:web:d25a4ee91b8a5af020dff1",
  measurementId: "G-9K313Y6QXY"
};

// Initialize Firebase
// Cast to 'any' to resolve TypeScript error where initializeApp is not found in the type definition
const app = (firebaseApp as any).initializeApp(firebaseConfig);
export const db = getFirestore(app);