// js/auth.js
import { auth, db } from "./firebaseConfig.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function register({ email, password, nickname }) {
  if (!email) throw new Error("メールアドレスを入力してください");
  if (!password || password.length < 6) throw new Error("パスワードは6文字以上にしてください");
  if (!nickname) throw new Error("ニックネームを入力してください");

  const result = await createUserWithEmailAndPassword(auth, email, password);
  const uid = result.user.uid;

  await setDoc(doc(db, "users", uid), {
    uid,
    email,
    nickname,
    role: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return result.user;
}

export async function login({ email, password }) {
  if (!email || !password) throw new Error("メールアドレスとパスワードを入力してください");
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export async function fetchUserData(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;
  return userSnap.data();
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
