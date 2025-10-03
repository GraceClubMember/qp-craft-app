// Doosri files se functions ko import karein
import { handleAuthState, setupLoginListener } from './auth-manager.js';
import { setupQuestionForms, setupQuestionBank } from './question-manager.js';

// App ko shuru karein
functioninitializeApp() {
    handleAuthState();
    setupLoginListener();
    setupQuestionForms();
    setupQuestionBank();
}

// App chalaayein
initializeApp();