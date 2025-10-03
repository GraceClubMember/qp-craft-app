import { db, auth } from './firebase-config.js';
import { currentUserRole } from './auth-manager.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements for dropdowns
const formGrade = document.getElementById('form-grade');
const formSubject = document.getElementById('form-subject');
const formQuestionType = document.getElementById('form-question-type');

const filterBoard = document.getElementById('filter-board');
const filterGrade = document.getElementById('filter-grade');
const filterSubject = document.getElementById('filter-subject');
const filterChapter = document.getElementById('filter-chapter');
const filterQuestionType = document.getElementById('filter-question-type');

// Helper function to populate a dropdown
function populateDropdown(selectElement, optionsArray) {
    selectElement.innerHTML = `<option value="">Select ${selectElement.id.split('-')[1]}</option>`; // Reset
    optionsArray.sort().forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        selectElement.appendChild(option);
    });
}

// Fetch dropdown options from Firestore once
export async function loadDropdownOptions() {
    const docRef = doc(db, 'metadata', 'dropdownOptions');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const options = docSnap.data();
        populateDropdown(formGrade, options.grades);
        populateDropdown(formSubject, options.subjects);
        populateDropdown(formQuestionType, options.questionTypes);

        // Populate filter dropdowns as well
        populateDropdown(filterBoard, ["CBSE", "ICSE", "State Board"]); // Boards hardcoded for now
        populateDropdown(filterGrade, options.grades);
        populateDropdown(filterSubject, options.subjects);
        populateDropdown(filterQuestionType, options.questionTypes);

        // Initially disable dependent dropdowns
        filterGrade.disabled = false;
        filterSubject.disabled = false;
        filterQuestionType.disabled = false;

    } else {
        console.error("Dropdown options not found in Firestore!");
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
        
        const q = query(collection(db, "questions"), 
            where("board", "==", board),
            where("grade", "==", grade),
            where("subject", "==", subject)
        );

        const querySnapshot = await getDocs(q);
        const chapters = new Set(); // Use a Set to get unique values
        querySnapshot.forEach(doc => {
            chapters.add(doc.data().chapter);
        });

        populateDropdown(filterChapter, Array.from(chapters));
        filterChapter.disabled = false;
    }
}

// Add event listeners to trigger chapter loading
filterBoard.addEventListener('change', populateChapterDropdown);
filterGrade.addEventListener('change', populateChapterDropdown);
filterSubject.addEventListener('change', populateChapterDropdown);


// --- Baaki ka question-manager.js code (Add, Bulk, Fetch, Delete) yahan se shuru hota hai ---

export function setupQuestionForms() {
    // ... Add Single Question and Bulk Upload logic yahan rahega (jaisa pehle tha)
}

export function setupQuestionBank() {
    // ... "Show Questions" Button Logic and Event Listeners for Question Cards yahan rahenge (jaisa pehle tha)
}

// ... fetchAndDisplayQuestions function yahan rahega (jaisa pehle tha)