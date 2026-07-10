import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "key-aquifer-gjwpf",
  appId: "1:156947487053:web:03473c6644891eda64bf04",
  apiKey: "AIzaSyDXYbHvXkG8WKe0iOIJYEBNi09HtH8IBFY",
  authDomain: "key-aquifer-gjwpf.firebaseapp.com",
  storageBucket: "key-aquifer-gjwpf.firebasestorage.app",
  messagingSenderId: "156947487053",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "ai-studio-taibaapartments-55569164-576d-48af-a142-eb7df54b9424");
