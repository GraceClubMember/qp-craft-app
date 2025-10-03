import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDx41mcczcSV7DcYHL20DMj0VMqQUsB0Qo",
  authDomain: "qp-craft.firebaseapp.com",
  projectId: "qp-craft",
  storageBucket: "qp-craft.firebasestorage.app",
  messagingSenderId: "358117125763",
  appId: "1:358117125763:web:463ed1f3e492a4bd8c35b6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Hum yahan se auth aur db ko 'export' kar rahe hain taaki dusri files inhe 'import' kar sakein
export { auth, db };