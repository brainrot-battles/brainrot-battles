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
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import type { PlayerStats, UserProfile, LeaderboardCategory, LeaderboardEntry } from './types';

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

// ── Auth State ────────────────────────────────────���────────

let currentUser: User | null = null;
let authReadyResolve: (() => void) | null = null;
const authReady = new Promise<void>(resolve => { authReadyResolve = resolve; });

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (authReadyResolve) {
    authReadyResolve();
    authReadyResolve = null;
  }
  // Clear cached username on logout
  if (!user) cachedUsername = null;
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

// ── User Profile & Username ────────────────────────────────

let cachedUsername: string | null = null;

export async function loadProfile(): Promise<UserProfile | null> {
  if (!currentUser) return null;
  const ref = doc(db, 'profiles', currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const profile = snap.data() as UserProfile;
    cachedUsername = profile.username;
    return profile;
  }
  return null;
}

export async function syncProfile(stats: PlayerStats): Promise<void> {
  if (!currentUser || !cachedUsername) return;
  const ref = doc(db, 'profiles', currentUser.uid);
  await setDoc(ref, {
    username: cachedUsername,
    usernameLower: cachedUsername.toLowerCase(),
    wins: stats.wins,
    losses: stats.losses,
    bestStreak: stats.bestStreak,
    highestArena: stats.highestArena,
    endlessBestFloor: stats.endless.bestFloor,
    endlessElo: stats.endless.elo,
    updatedAt: serverTimestamp(),
  });
}

export async function checkUsernameAvailable(name: string): Promise<'available' | 'taken' | 'own'> {
  if (!currentUser) return 'taken';
  const ref = doc(db, 'usernames', name.toLowerCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return 'available';
  if (snap.data().uid === currentUser.uid) return 'own';
  return 'taken';
}

export async function claimUsername(newName: string, oldName?: string): Promise<void> {
  if (!currentUser) throw new Error('Not logged in');
  const uid = currentUser.uid;
  const newNameLower = newName.toLowerCase();

  // Delete old username reservation if changing
  if (oldName) {
    const oldRef = doc(db, 'usernames', oldName.toLowerCase());
    await deleteDoc(oldRef).catch(() => {});
  }

  // Atomically claim the new username
  const newRef = doc(db, 'usernames', newNameLower);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(newRef);
    if (snap.exists() && snap.data().uid !== uid) {
      throw new Error('Username taken');
    }
    tx.set(newRef, {
      uid,
      displayName: newName,
      createdAt: serverTimestamp(),
    });
  });

  // Update profile with new username
  cachedUsername = newName;
  const profileRef = doc(db, 'profiles', uid);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    await setDoc(profileRef, { ...profileSnap.data(), username: newName, usernameLower: newNameLower, updatedAt: serverTimestamp() });
  } else {
    // Create minimal profile (will be fully synced on next saveStats)
    await setDoc(profileRef, {
      username: newName,
      usernameLower: newNameLower,
      wins: 0, losses: 0, bestStreak: 0,
      highestArena: 1, endlessBestFloor: 0, endlessElo: 1000,
      updatedAt: serverTimestamp(),
    });
  }
}

// ── Leaderboard ────────────────────────────────────────────

export async function fetchLeaderboard(category: LeaderboardCategory, max = 50): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, 'profiles'),
    orderBy(category, 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  const entries: LeaderboardEntry[] = [];
  snap.docs.forEach((d, i) => {
    const data = d.data() as UserProfile;
    entries.push({ ...data, rank: i + 1, uid: d.id });
  });
  return entries;
}

// ── Helpers ────────────────────────────────────────────────

export function isLoggedIn(): boolean {
  return currentUser !== null;
}

export function getUserDisplayName(): string {
  if (!currentUser) return '';
  if (cachedUsername) return cachedUsername;
  return currentUser.displayName || currentUser.email || 'Player';
}

export function getCachedUsername(): string | null {
  return cachedUsername;
}
