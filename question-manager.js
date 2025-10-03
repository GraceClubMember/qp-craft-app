// firebase-config se db aur auth ko import kiya
import { db, auth } from './firebase-config.js';
// auth-manager se role check karne ke liye variable import kiya
import { currentUserRole } from './auth-manager.js';
import { doc, setDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

export function setupQuestionForms() {
    // Add Single Question Logic
    document.getElementById('add-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const questionData = {
            board: document.getElementById('form-board').value, grade: document.getElementById('form-grade').value, subject: document.getElementById('form-subject').value, chapter: document.getElementById('form-chapter').value,
            questionType: document.getElementById('form-question-type').value, questionText: document.getElementById('form-question-text').value, answer: document.getElementById('form-answer').value,
            createdAt: new Date(), addedBy: auth.currentUser.uid
        };
        try {
            const newQuestionRef = doc(collection(db, "questions"));
            await setDoc(newQuestionRef, questionData);
            alert("Question added successfully!");
            e.target.reset();
        } catch (error) { alert("Failed to add question."); }
    });

    // Bulk Upload Logic
    document.getElementById('upload-csv-btn').addEventListener('click', () => {
        const file = document.getElementById('csv-file-input').files[0];
        if (!file) return alert("Please select a CSV file first.");

        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results) => {
                const questions = results.data;
                const uploadStatus = document.getElementById('upload-status');
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
                    document.getElementById('csv-file-input').value = '';
                    setTimeout(() => uploadStatus.classList.add('hidden'), 5000);
                } catch (error) { uploadStatus.textContent = "Error during upload."; }
            },
            error: (err) => alert("Error parsing CSV: " + err.message)
        });
    });
}

export function setupQuestionBank() {
    // "Show Questions" Button Logic
    document.getElementById('fetch-questions-btn').addEventListener('click', () => {
        const filters = {
            board: document.getElementById('filter-board').value, grade: document.getElementById('filter-grade').value, subject: document.getElementById('filter-subject').value,
            chapter: document.getElementById('filter-chapter').value, questionType: document.getElementById('filter-question-type').value
        };
        if (Object.values(filters).some(val => !val)) {
            alert("Please fill all 5 filters to search for questions.");
            return;
        }
        fetchAndDisplayQuestions(filters);
    });

    // Event Listeners for Question Cards
    document.getElementById('questions-list').addEventListener('click', async (e) => {
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
                } catch (error) { alert("Failed to delete question."); }
            }
        }
    });
}

async function fetchAndDisplayQuestions(filters) {
    const questionsList = document.getElementById('questions-list');
    questionsList.innerHTML = '<p>Loading questions...</p>';
    try {
        const q = query(
            collection(db, "questions"),
            where("board", "==", filters.board), where("grade", "==", filters.grade), where("subject", "==", filters.subject),
            where("chapter", "==", filters.chapter), where("questionType", "==", filters.questionType)
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
                <div class="question-header"> <p class="question-text">${question.questionText}</p> <input type="checkbox" class="question-checkbox" data-id="${questionId}"> </div>
                <div class="question-meta"> Type: ${question.questionType} </div>
                <div class="question-answer hidden"> <strong>Answer:</strong> ${question.answer} </div>
                <div class="question-actions">
                    <button class="answer-btn">Show Answer</button>
                    ${currentUserRole === 'admin' ? `<button class="delete-btn" data-id="${questionId}">Delete</button>` : ''}
                </div>
            `;
            questionsList.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        questionsList.innerHTML = '<p>Error loading questions. You may need to create an index in Firestore.</p>';
    }
}