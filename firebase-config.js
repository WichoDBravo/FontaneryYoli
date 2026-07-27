import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================================
// Configuración
// ==================================

const firebaseConfig = {
    apiKey: "AIzaSyCBJQlNjZmZ8hYTbKIdc5A7iSCXKmQkK20",
    authDomain: "fontaneriayoli-ca581.firebaseapp.com",
    projectId: "fontaneriayoli-ca581",
    storageBucket: "fontaneriayoli-ca581.firebasestorage.app",
    messagingSenderId: "1018807991105",
    appId: "1:1018807991105:web:e26a27cea3bccd7cbcffc0",
    measurementId: "G-JP0ZKE3YZ7"
};

// ====================
// INICIALIZAR FIREBASE
// ====================

const app = initializeApp(firebaseConfig);

// =====================
// EXPORTAR SERVICIOS
// =====================

// Autenticacion
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

// Exportar funciones de Firestore
export {
    collection,
    doc,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
};

// Exportar funciones de Autenticacion
export {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
};

console.log("🔥 Firebase inicializado correctamente");