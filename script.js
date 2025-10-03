// Firebase SDKs ko import karein
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// YOUR FIREBASE CONFIG
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

const loginSection = document.getElementById('login-section');
const appContent = document.getElementById('app-content');
const adminPanel = document.getElementById('admin-panel');
const authContainer = document.getElementById('auth-container');
const addQuestionForm = document.getElementById('add-question-form');
const questionsList = document.getElementById('questions-list');
const fetchQuestionsBtn = document.getElementById('fetch-questions-btn');
const uploadCsvBtn = document.getElementById('upload-csv-btn');
const csvFileInput = document.getElementById('csv-file-input');
const uploadStatus = document.getElementById('upload-status');

let currentUserRole = null;

// User Auth State
onAuthStateChanged(auth, async (user) => {
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

// Login Logic
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password).catch(error => alert(error.message));
});

// Add Single Question Logic
addQuestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const questionData = {
        board: document.getElementById('form-board').value,
        grade: document.getElementById('form-grade').value,
        subject: document.getElementById('form-subject').value,
        chapter: document.getElementById('form-chapter').value,
        questionType: document.getElementById('form-question-type').value,
        questionText: document.getElementById('form-question-text').value,
        answer: document.getElementById('form-answer').value,
        createdAt: new Date(),
        addedBy: auth.currentUser.uid
    };

    try {
        const newQuestionRef = doc(collection(db, "questions"));
        await setDoc(newQuestionRef, questionData);
        alert("Question added successfully!");
        addQuestionForm.reset();
    } catch (error) {
        console.error("Error adding question:", error);
        alert("Failed to add question.");
    }
});

// Bulk Upload from CSV Logic
uploadCsvBtn.addEventListener('click', () => {
    const file = csvFileInput.files[0];
    if (!file) {
        alert("Please select a CSV file first.");
        return;