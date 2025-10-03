import { handleAuthState, setupLoginListener } from './auth-manager.js';
import { setupQuestionForms, setupQuestionBank, loadDropdownOptions } from './question-manager.js'; // loadDropdownOptions ko import kiya

function initializeApp() {
    handleAuthState();
    setupLoginListener();
    loadDropdownOptions(); // Dropdowns ko load karne ke liye call kiya
    setupQuestionForms();
    setupQuestionBank();
}

document.addEventListener('DOMContentLoaded', initializeApp);