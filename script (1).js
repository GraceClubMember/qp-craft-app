// Firebase SDKs ko import karein
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

// HTML Elements
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

// Auth State Logic
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
    signInWithEmailAndPassword(auth, e.target['login-email'].value, e.target['login-password'].value)
        .catch(error => alert(error.message));
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
        alert("Failed to add question.");
    }
});

// Bulk Upload Logic
uploadCsvBtn.addEventListener('click', () => {
    const file = csvFileInput.files[0];
    if (!file) return alert("Please select a CSV file first.");

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const questions = results.data;
            if (questions.length === 0) return alert("CSV file is empty or invalid.");
            uploadStatus.classList.remove('hidden');
            uploadStatus.textContent = `Uploading ${questions.length} questions...`;
            try {
                const batch = writeBatch(db);
                questions.forEach(q => {
                    if (!q.board || !q.grade || !q.subject || !q.chapter || !q.questionType || !q.questionText || !q.answer) return;
                    const newQuestionRef = doc(collection(db, "questions"));
                    batch.set(newQuestionRef, { ...q, createdAt: new Date(), addedBy: auth.currentUser.uid });
                });
                await batch.commit();
                uploadStatus.textContent = `Successfully uploaded ${questions.length} questions!`;
                csvFileInput.value = '';
                setTimeout(() => uploadStatus.classList.add('hidden'), 5000);
            } catch (error) {
                uploadStatus.textContent = "Error during upload.";
            }
        },
        error: (err) => alert("Error parsing CSV: " + err.message)
    });
});

// "Show Questions" Button Logic
fetchQuestionsBtn.addEventListener('click', () => {
    const board = document.getElementById('filter-board').value;
    const grade = document.getElementById('filter-grade').value;
    const subject = document.getElementById('filter-subject').value;
    const chapter = document.getElementById('filter-chapter').value;
    const questionType = document.getElementById('filter-question-type').value; // Naya filter
    
    if (!board || !grade || !subject || !chapter || !questionType) { // Naya check
        alert("Please fill all 5 filters to search for questions.");
        return;
    }
    fetchAndDisplayQuestions(board, grade, subject, chapter, questionType); // Naya argument
});

// Fetch and Display Questions Function
async function fetchAndDisplayQuestions(board, grade, subject, chapter, questionType) { // Naya parameter
    questionsList.innerHTML = '<p>Loading questions...</p>';
    try {
        // YAHAN QUERY KO UPDATE KIYA GAYA HAI
        const q = query(
            collection(db, "questions"),
            where("board", "==", board),
            where("grade", "==", grade),
            where("subject", "==", subject),
            where("chapter", "==", chapter),
            where("questionType", "==", questionType) // Naya filter
            // KOI BHI orderBy nahi hai
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            questionsList.innerHTML = '<p>No questions found for this selection.</p>';
            return;
        }
        questionsList.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const question = doc.data();
            const questionId = doc.id;
            const card = document.createElement('div');
            card.className = 'question-card';
            card.innerHTML = `
                <div class="question-header">
                    <p class="question-text">${question.questionText}</p>
                    <input type="checkbox" class="question-checkbox" data-id="${questionId}">
                </div>
                <div class="question-meta">
                    Type: ${question.questionType}
                </div>
                <div class="question-answer hidden">
                    <strong>Answer:</strong> ${question.answer}
                </div>
                <div class="question-actions">
                    <button class="answer-btn">Show Answer</button>
                    ${currentUserRole === 'admin' ? `<button class="delete-btn" data-id="${questionId}">Delete</button>` : ''}
                </div>
            `;
            questionsList.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        questionsList.innerHTML = '<p>Error loading questions. Please try again.</p>';
    }
}

// Event Listeners for Question Cards
questionsList.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.classList.contains('answer-btn')) {
        const answerDiv = target.closest('.question-card').querySelector('.question-answer');
        answerDiv.classList.toggle('hidden');
        target.textContent = answerDiv.classList.contains('hidden') ? 'Show Answer' : 'Hide Answer';
    }
    if (target.classList.contains('delete-btn')) {
        const questionId = target.dataset.id;
        if (confirm("Are you sure?")) {
            try {
                await deleteDoc(doc(db, "questions", questionId));
                target.closest('.question-card').remove();
            } catch (error) {
                alert("Failed to delete question.");
            }
        }
    }
});