// firebase-config.js se auth ko import kiya
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Global variable taaki dusri files role check kar sakein
export let currentUserRole = null; 

export function handleAuthState() {
    onAuthStateChanged(auth, async (user) => {
        const loginSection = document.getElementById('login-section');
        const appContent = document.getElementById('app-content');
        const adminPanel = document.getElementById('admin-panel');
        const authContainer = document.getElementById('auth-container');

        if (user) {
            loginSection.classList.add('hidden');
            appContent.classList.remove('hidden');
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            currentUserRole = (userDoc.exists() && userDoc.data().role === 'admin') ? 'admin' : 'teacher';
            adminPanel.classList.toggle('hidden', currentUserRole !== 'admin');
            authContainer.innerHTML = `<p>Welcome, ${user.email}! <button id="logout-btn">Logout</button></p>`;
            document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
        } else {
            currentUserRole = null;
            loginSection.classList.remove('hidden');
            appContent.classList.add('hidden');
            authContainer.innerHTML = '';
        }
    });
}

export function setupLoginListener() {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, e.target['login-email'].value, e.target['login-password'].value)
            .catch(error => alert(error.message));
    });
}