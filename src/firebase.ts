import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import type { PlayerStats } from './types';

// ── Firebase Config ────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyB1dn79KxO_UGtnx7tgkOyaEjKFXtoY_2U",
  authDomain: "brainrot-battles-9000.firebaseapp.com",
  projectId: "brainrot-battles-9000",
  storageBucket: "brainrot-battles-9000.firebasestorage.app",
  messagingSenderId: "874303912963",
  appId: "1:874303912963:web:e5765cfe0f57ea881de236",
  measurementId: "G-RG5Q4QJTCQ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Auth State ─────────────────────────────────────────────

let currentUser: User | null = null;
let authReadyResolve: (() => void) | null = null;
const authReady = new Promise<void>(resolve => { authReadyResolve = resolve; });

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (authReadyResolve) {
    authReadyResolve();
    authReadyResolve = null;
  }
});

export function getUser(): User | null { return currentUser; }
export function waitForAuth(): Promise<void> { return authReady; }

// ── Auth Methods ───────────────────────────────────────────

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

// ── Cloud Save ─────────────────────────────────────────────

export async function loadCloudSave(): Promise<PlayerStats | null> {
  if (!currentUser) return null;
  const ref = doc(db, 'saves', currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as PlayerStats;
  }
  return null;
}

export async function saveToCloud(stats: PlayerStats): Promise<void> {
  if (!currentUser) return;
  const ref = doc(db, 'saves', currentUser.uid);
  await setDoc(ref, JSON.parse(JSON.stringify(stats)));
}

export function isLoggedIn(): boolean {
  return currentUser !== null;
}

export function getUserDisplayName(): string {
  if (!currentUser) return '';
  return currentUser.displayName || currentUser.email || 'Player';
}
