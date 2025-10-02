// Firebase SDKs ko import karein
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDx41mcczcSV7DcYHL20DMj0VMqQUsB0Qo",
  authDomain: "qp-craft.firebaseapp.com",
  projectId: "qp-craft",
  storageBucket: "qp-craft.firebasestorage.app",
  messagingSenderId: "358117125763",
  appId: "1:358117125763:web:463ed1f3e492a4bd8c35b6"
};

// Firebase ko initialize karein
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HTML elements ko select karein
const loginSection = document.getElementById('login-section');
const appContent = document.getElementById('app-content');
const adminPanel = document.getElementById('admin-panel');
const authContainer = document.getElementById('auth-container');
const addQuestionForm = document.getElementById('add-question-form');
const questionsList = document.getElementById('questions-list');
const fetchQuestionsBtn = document.getElementById('fetch-questions-btn');

let currentUserRole = null;

// User ke login status ko check karein
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginSection.classList.add('hidden');
        appContent.classList.remove('hidden');

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            currentUserRole = 'admin';
            adminPanel.classList.remove('hidden');
        } else {
            currentUserRole = 'teacher';
            adminPanel.classList.add('hidden');
        }

        authContainer.innerHTML = `<p>Welcome, ${user.email}! <button id="logout-btn">Logout</button></p>`;
        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    } else {
        currentUserRole = null;
        loginSection.classList.remove('hidden');
        appContent.classList.add('hidden');
        authContainer.innerHTML = '';
    }
});

// Login Form ka logic
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => alert(error.message));
});

// Admin Panel: Naya question add karne ka logic
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
        marks: Number(document.getElementById('form-marks').value),
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

// "Show Questions" button ka logic
fetchQuestionsBtn.addEventListener('click', () => {
    const board = document.getElementById('filter-board').value;
    const grade = document.getElementById('filter-grade').value;
    const subject = document.getElementById('filter-subject').value;
    const chapter = document.getElementById('filter-chapter').value;
    
    if (!board || !grade || !subject || !chapter) {
        alert("Please fill all the filters to search for questions.");
        return;
    }
    
    fetchAndDisplayQuestions(board, grade, subject, chapter);
});

// Firestore se questions laane aur dikhane ka function
async function fetchAndDisplayQuestions(board, grade, subject, chapter) {
    questionsList.innerHTML = '<p>Loading questions...</p>';
    
    try {
        const q = query(
            collection(db, "questions"),
            where("board", "==", board),
            where("grade", "==", grade),
            where("subject", "==", subject),
            where("chapter", "==", chapter),
            orderBy("marks", "asc") // Low marks se high marks tak
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            questionsList.innerHTML = '<p>No questions found for this selection.</p>';
            return;
        }

        questionsList.innerHTML = ''; // List ko saaf karein
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
                    Marks: ${question.marks} | Type: ${question.questionType}
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
        console.error("Error fetching questions:", error);
        questionsList.innerHTML = '<p>Error loading questions. Please check the console.</p>';
    }
}

// Show Answer, Delete, Checkbox ke liye Event Listener
questionsList.addEventListener('click', async (e) => {
    const target = e.target;

    // Show/Hide Answer button
    if (target.classList.contains('answer-btn')) {
        const answerDiv = target.closest('.question-card').querySelector('.question-answer');
        answerDiv.classList.toggle('hidden');
        target.textContent = answerDiv.classList.contains('hidden') ? 'Show Answer' : 'Hide Answer';
    }

    // Delete button
    if (target.classList.contains('delete-btn')) {
        const questionId = target.dataset.id;
        if (confirm("Are you sure you want to delete this question?")) {
            try {
                await deleteDoc(doc(db, "questions", questionId));
                alert("Question deleted successfully!");
                target.closest('.question-card').remove();
            } catch (error) {
                console.error("Error deleting question:", error);
                alert("Failed to delete question.");
            }
        }
    }
    
    // Checkbox for paper generator
    if (target.classList.contains('question-checkbox')) {
        const questionId = target.dataset.id;
        if (target.checked) {
            console.log(`Question ${questionId} added to paper generator.`);
            // Future mein yahan par question ko generator ki list me add karne ka logic aayega
        } else {
            console.log(`Question ${questionId} removed from paper generator.`);
            // Future mein yahan par question ko list se hatane ka logic aayega
        }
    }
});