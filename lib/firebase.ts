// /lib/firebase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
//@ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase, push, ref } from 'firebase/database'; // ✅ Realtime Database
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_REALTIME_DB_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firebase services
// Use AsyncStorage for persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app); // Firestore
export const dbRealtime = getDatabase(app); // Realtime Database
export const storage = getStorage(app);

// ✅ Export a helper to push SOS data
export const pushSOS = async (touristId: string, latitude: number, longitude: number) => {
  try {
    const efirsRef = ref(dbRealtime, 'efirs');
    const res = await push(efirsRef, {
      tourist_id: touristId,
      location: { latitude, longitude },
      timestamp: Date.now(),
    });
    console.log('SOS data pushed, key:', res.key);
    return res.key;
  } catch (err) {
    console.error('Failed to push SOS data:', err);
    throw err;
  }
};
