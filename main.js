// Doosri files se functions ko import karein
import { handleAuthState, setupLoginListener } from './auth-manager.js';
import { setupQuestionForms, setupQuestionBank } from './question-manager.js';

// App ko shuru karein
function initializeApp() {
    handleAuthState();
    setupLoginListener();
    setupQuestionForms();
    setupQuestionBank();
}

// Jab poora HTML page ban jaaye, tab app chalaayein
document.addEventListener('DOMContentLoaded', initializeApp);