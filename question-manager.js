import { db, auth } from './firebase-config.js';
import { currentUserRole } from './auth-manager.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements
const formGrade = document.getElementById('form-grade');
const formSubject = document.getElementById('form-subject');
const formQuestionType = document.getElementById('form-question-type');
const filterBoard = document.getElementById('filter-board');
const filterGrade = document.getElementById('filter-grade');
const filterSubject = document.getElementById('filter-subject');
const filterChapter = document.getElementById('filter-chapter');
const filterQuestionType = document.getElementById('filter-question-type');

// Helper function
function populateDropdown(selectElement, optionsArray, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    optionsArray.sort().forEach(optionValue => {
        const option = new Option(optionValue, optionValue);
        selectElement.appendChild(option);
    });
}

// Fetch dropdown options from Firestore
export async function loadDropdownOptions() {
    try {
        const docRef = doc(db, 'metadata', 'dropdownOptions');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const options = docSnap.data();
            populateDropdown(formGrade, options.grades, "Select Grade");
            populateDropdown(formSubject, options.subjects, "Select Subject");
            populateDropdown(formQuestionType, options.questionTypes, "Select Question Type");

            populateDropdown(filterBoard, ["CBSE", "ICSE", "State Board"], "Select Board");
            populateDropdown(filterGrade, options.grades, "Select Grade");
            populateDropdown(filterSubject, options.subjects, "Select Subject");
            populateDropdown(filterQuestionType, options.questionTypes, "Select Question Type");

            filterGrade.disabled = false;
            filterSubject.disabled = false;
            filterChapter.disabled = true; // Chapter shuru me disabled rahega
            filterQuestionType.disabled = false;
        } else {
            console.error("CRITICAL: Dropdown options document not found in Firestore!");
        }
    } catch (error) {
        console.error("Error loading dropdown options:", error);
    }
}

// CASCADING DROPDOWN LOGIC
async function populateChapterDropdown() {
    const board = filterBoard.value;
    const grade = filterGrade.value;
    const subject = filterSubject.value;

    if (board && grade && subject) {
        filterChapter.disabled = true;
        filterChapter.innerHTML = '<option value="">Loading Chapters...</option>';
        
        try {
            const q = query(collection(db, "questions"), 
                where("board", "==", board),
                where("grade", "==", grade),
                where("subject", "==", subject)
            );
            const querySnapshot = await getDocs(q);
            const chapters = new Set(querySnapshot.docs.map(doc => doc.data().chapter));
            populateDropdown(filterChapter, Array.from(chapters), "Select Chapter");
            filterChapter.disabled = false;
        } catch (error) {
            console.error("Error fetching chapters:", error);
            filterChapter.innerHTML = '<option value="">Error loading</option>';
        }
    }
}

// Setup Event Listeners
export function setupQuestionBank() {
    filterBoard.addEventListener('change', populateChapterDropdown);
    filterGrade.addEventListener('change', populateChapterDropdown);
    filterSubject.addEventListener('change', populateChapterDropdown);

    document.getElementById('fetch-questions-btn').addEventListener('click', () => {
        const filters = {
            board: filterBoard.value, grade: filterGrade.value, subject: filterSubject.value,
            chapter: filterChapter.value, questionType: filterQuestionType.value
        };
        if (Object.values(filters).some(val => !val)) {
            alert("Please fill all 5 filters.");
            return;
        }
        fetchAndDisplayQuestions(filters);
    });
    
    document.getElementById('questions-list').addEventListener('click', handleQuestionCardClick);
}

// Add/Bulk Question Forms Logic
export function setupQuestionForms() {
    document.getElementById('add-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const questionData = {
            board: e.target['form-board'].value, grade: e.target['form-grade'].value, subject: e.target['form-subject'].value,
            chapter: e.target['form-chapter'].value, questionType: e.target['form-question-type'].value,
            questionText: e.target['form-question-text'].value, answer: e.target['form-answer'].value,
            createdAt: new Date(), addedBy: auth.currentUser.uid
        };
        try {
            await setDoc(doc(collection(db, "questions")), questionData);
            alert("Question added successfully!");
            e.target.reset();
        } catch (error) { alert("Failed to add question."); }
    });

    document.getElementById('upload-csv-btn').addEventListener('click', () => {
        const file = document.getElementById('csv-file-input').files[0];
        if (!file) return alert("Please select a CSV file.");
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: handleCsvUpload,
            error: (err) => alert("Error parsing CSV: " + err.message)
        });
    });
}

// Helper for CSV upload
async function handleCsvUpload(results) {
    const questions = results.data;
    const uploadStatus = document.getElementById('upload-status');
    if (questions.length === 0) return alert("CSV file is empty.");
    uploadStatus.classList.remove('hidden');
    uploadStatus.textContent = `Uploading ${questions.length} questions...`;
    try {
        const batch = writeBatch(db);
        questions.forEach(q => {
            if (!q.board || !q.grade || !q.subject || !q.chapter || !q.questionType || !q.questionText || !q.answer) return;
            batch.set(doc(collection(db, "questions")), { ...q, createdAt: new Date(), addedBy: auth.currentUser.uid });
        });
        await batch.commit();
        uploadStatus.textContent = `Successfully uploaded ${questions.length} questions!`;
        document.getElementById('csv-file-input').value = '';
        setTimeout(() => uploadStatus.classList.add('hidden'), 5000);
    } catch (error) { uploadStatus.textContent = "Error during upload."; }
}

// Fetch and display questions
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
            const card = document.createElement('div');
            card.className = 'question-card';
            card.innerHTML = `
                <div class="question-header"> <p class="question-text">${question.questionText}</p> <input type="checkbox" class="question-checkbox" data-id="${doc.id}"> </div>
                <div class="question-meta"> Type: ${question.questionType} </div>
                <div class="question-answer hidden"> <strong>Answer:</strong> ${question.answer} </div>
                <div class="question-actions">
                    <button class="answer-btn">Show Answer</button>
                    ${currentUserRole === 'admin' ? `<button class="delete-btn" data-id="${doc.id}">Delete</button>` : ''}
                </div>
            `;
            questionsList.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        questionsList.innerHTML = '<p>Error loading questions. You may need to create an index in Firestore.</p>';
    }
}

// Handle clicks inside question cards
async function handleQuestionCardClick(e) {
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
}