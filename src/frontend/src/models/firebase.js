import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAi9Y80Fk-wx63Db3LUNj8zOCFX_Sojs6w',
  authDomain: 'limkokwing-university.firebaseapp.com',
  projectId: 'limkokwing-university',
  storageBucket: 'limkokwing-university.firebasestorage.app',
  messagingSenderId: '57371102535',
  appId: '1:57371102535:web:2b7102c3179d1945969062',
  measurementId: 'G-35S4BDKK3Y',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
