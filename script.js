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
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const questions = results.data;
            if (questions.length === 0) {
                alert("CSV file is empty or invalid.");
                return;
            }

            uploadStatus.classList.remove('hidden');
            uploadStatus.textContent = `Uploading ${questions.length} questions... Please wait.`;

            try {
                // Batch write ka istemaal karein for efficiency
                const batch = writeBatch(db);
                questions.forEach(q => {
                    // Check karein ki saare required columns maujood hain
                    if (!q.board || !q.grade || !q.subject || !q.chapter || !q.questionType || !q.questionText || !q.answer) {
                        console.warn("Skipping invalid row:", q);
                        return; // Invalid row ko skip karein
                    }
                    const newQuestionRef = doc(collection(db, "questions"));
                    const questionData = {
                        ...q,
                        createdAt: new Date(),
                        addedBy: auth.currentUser.uid
                    };
                    batch.set(newQuestionRef, questionData);
                });

                await batch.commit();
                uploadStatus.textContent = `Successfully uploaded ${questions.length} questions!`;
                csvFileInput.value = ''; // File input ko reset karein
                setTimeout(() => uploadStatus.classList.add('hidden'), 5000);
            } catch (error) {
                console.error("Error in bulk upload: ", error);
                uploadStatus.textContent = "Error during upload. Check console.";
            }
        },
        error: (error) => {
            alert("Error parsing CSV file: " + error.message);
        }
    });
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
            // marks ab nahi hai, to hum createdAt se sort kar sakte hain
            orderBy("createdAt", "desc")
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
        console.error("Error fetching questions:", error);
        questionsList.innerHTML = '<p>Error loading questions. You may need to create an index in Firestore. Check console for the link.</p>';
    }
}

// Show Answer, Delete, Checkbox ke liye Event Listener
questionsList.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.classList.contains('answer-btn')) {
        const answerDiv = target.closest('.question-card').querySelector('.question-answer');
        answerDiv.classList.toggle('hidden');
        target.textContent = answerDiv.classList.contains('hidden') ? 'Show Answer' : 'Hide Answer';
    }
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
    if (target.classList.contains('question-checkbox')) {
        // Future logic
    }
});