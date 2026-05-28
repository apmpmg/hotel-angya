import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const hotels = ["アパホテル", "東横イン", "ドーミーイン", "ルートイン"];

let currentUser = null;
let records = [];

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    await loadRecords();
    showHome();
  } else {
    records = [];
    showLogin();
  }
});

function showLogin() {
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>ログイン</h2>

      <input id="email" type="email" placeholder="メールアドレス">
      <input id="password" type="password" placeholder="パスワード">

      <button onclick="login()">ログイン</button>
      <button onclick="signup()">新規登録</button>
    </div>
  `;
}

async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await createUserWithEmailAndPassword(auth, email, password);
  alert("登録しました");
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await signInWithEmailAndPassword(auth, email, password);
  alert("ログインしました");
}

async function logout() {
  await signOut(auth);
  alert("ログアウトしました");
}

async function loadRecords() {
  if (!currentUser) return;

  const q = query(
    collection(db, "records"),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);

  records = [];
  snap.forEach((d) => {
    records.push({ id: d.id, ...d.data() });
  });
}

async function addRecord(name) {
  if (!currentUser) {
    alert("ログインしてください");
    return;
  }

  await addDoc(collection(db, "records"), {
    uid: currentUser.uid,
    email: currentUser.email,
    hotel: name,
    createdAt: Date.now()
  });

  alert("Firebaseに保存した");
  await loadRecords();
  showRecord();
}

async function deleteRecord(id) {
  if (!confirm("削除しますか？")) return;

  await deleteDoc(doc(db, "records", id));

  await loadRecords();
  showRecord();
}

function showPage(page) {
  if (!currentUser) {
    showLogin();
    return;
  }

  if (page === "home") showHome();
  if (page === "search") showSearch();
  if (page === "record") showRecord();
  if (page === "ranking") showRanking();
  if (page === "mypage") showMyPage();
}

function showHome() {
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>ホーム</h2>
      <p>ログイン中：${currentUser.email}</p>
      <p>Firebase接続済み</p>
    </div>
  `;
}

function showSearch() {
  let html = `<div class="card"><h2>ホテル検索</h2>`;

  hotels.forEach(hotel => {
    html += `<button onclick="addRecord('${hotel}')">${hotel}</button><br><br>`;
  });

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

function showRecord() {
  let html = `<div class="card"><h2>自分の記録一覧</h2>`;

  if (records.length === 0) {
    html += `<p>記録はまだありません</p>`;
  }

  records.forEach(r => {
    html += `
      <p>
        ${r.hotel}
        <button onclick="deleteRecord('${r.id}')">削除</button>
      </p>
    `;
  });

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

function showRanking() {
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>ランキング</h2>
      <p>自分の記録数: ${records.length}</p>
    </div>
  `;
}

function showMyPage() {
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>マイページ</h2>
      <p>${currentUser.email}</p>
      <p>記録数: ${records.length}</p>
      <button onclick="logout()">ログアウト</button>
    </div>
  `;
}

window.showPage = showPage;
window.signup = signup;
window.login = login;
window.logout = logout;
window.addRecord = addRecord;
window.deleteRecord = deleteRecord;
