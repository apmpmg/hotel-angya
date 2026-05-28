import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebaseConfig.js";

// =========================
// Firebase
// =========================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =========================
// State
// =========================

const state = {
  user: null,
  hotels: [],
  records: [],
  loading: false,
  error: ""
};

const content = document.getElementById("content");

// =========================
// Utility
// =========================

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoading(text = "読み込み中...") {
  content.innerHTML = `
    <div class="card">
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function showError(title, error) {
  console.error(title, error);

  content.innerHTML = `
    <div class="card">
      <h2>エラー</h2>
      <p>${escapeHtml(title)}</p>
      <small>${escapeHtml(error?.message || error)}</small>
    </div>
  `;
}

// =========================
// Auth監視
// =========================

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.error = "";

  if (!user) {
    state.hotels = [];
    state.records = [];
    renderLogin();
    return;
  }

  try {
    setLoading("データを読み込み中...");

    await loadHotels();
    await loadRecords();

    renderHome();
  } catch (error) {
    showError("ログイン後のデータ読み込みに失敗しました", error);
  }
});

// =========================
// Firestore読み込み
// =========================

async function loadHotels() {
  try {
    const snap = await getDocs(collection(db, "hotels"));

    state.hotels = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    console.log("hotels:", state.hotels);
  } catch (error) {
    console.error("hotels読み込み失敗:", error);
    throw error;
  }
}

async function loadRecords() {
  if (!state.user) return;

  try {
    const q = query(
      collection(db, "records"),
      where("uid", "==", state.user.uid),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    state.records = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    console.log("records:", state.records);
  } catch (error) {
    console.error("records読み込み失敗:", error);
    throw error;
  }
}

// =========================
// Auth操作
// =========================

async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("メールアドレスとパスワードを入力してください");
    return;
  }

  if (password.length < 6) {
    alert("パスワードは6文字以上にしてください");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("登録しました");
  } catch (error) {
    alert(error.message);
  }
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("メールアドレスとパスワードを入力してください");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
}

async function logout() {
  await signOut(auth);
}

// =========================
// Records操作
// =========================

async function addRecord(hotelId) {
  if (!state.user) {
    alert("ログインしてください");
    return;
  }

  const hotel = state.hotels.find((h) => h.id === hotelId);

  if (!hotel) {
    alert("ホテル情報が見つかりません");
    return;
  }

  try {
    await addDoc(collection(db, "records"), {
      uid: state.user.uid,
      email: state.user.email,
      hotelId: hotel.id,
      hotelName: hotel.name || hotel.hotelName || "名称未設定",
      area: hotel.area || "",
      city: hotel.city || "",
      createdAt: Date.now()
    });

    await loadRecords();
    renderRecords();
  } catch (error) {
    showError("記録に失敗しました", error);
  }
}

async function deleteRecord(recordId) {
  if (!confirm("削除しますか？")) return;

  try {
    await deleteDoc(doc(db, "records", recordId));
    await loadRecords();
    renderRecords();
  } catch (error) {
    showError("削除に失敗しました", error);
  }
}

// =========================
// Page切り替え
// =========================

function showPage(page) {
  if (!state.user) {
    renderLogin();
    return;
  }

  if (page === "home") renderHome();
  if (page === "search") renderSearch();
  if (page === "record") renderRecords();
  if (page === "ranking") renderRanking();
  if (page === "mypage") renderMyPage();

  setActiveTab(page);
}

function setActiveTab(page) {
  document.querySelectorAll(".nav button").forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.page === page) {
      button.classList.add("active");
    }
  });
}

// =========================
// Render
// =========================

function renderLogin() {
  content.innerHTML = `
    <div class="card">
      <h2>ホテル巡礼</h2>
      <p>ログインしてください</p>

      <input id="email" type="email" placeholder="メールアドレス">
      <input id="password" type="password" placeholder="パスワード">

      <button onclick="login()">ログイン</button>
      <button onclick="signup()">新規登録</button>
    </div>
  `;
}

function renderHome() {
  content.innerHTML = `
    <div class="card">
      <h2>ホーム</h2>
      <p>ログイン中：${escapeHtml(state.user.email)}</p>
      <p>登録ホテル数：${state.hotels.length}</p>
      <p>自分の記録数：${state.records.length}</p>
      <button onclick="showPage('search')">ホテルを探す</button>
    </div>
  `;

  setActiveTab("home");
}

function renderSearch() {
  let html = `
    <div class="card">
      <h2>ホテル検索</h2>
      <p>登録ホテル数：${state.hotels.length}</p>
  `;

  if (state.hotels.length === 0) {
    html += `
      <p>ホテルデータがまだありません。</p>
      <small>
        Firestore の hotels コレクションにデータがあるか、読み取りルールが許可されているか確認してください。
      </small>
    `;
  }

  state.hotels.forEach((hotel) => {
    const name = hotel.name || hotel.hotelName || hotel.title || "名称未設定";
    const area = hotel.area || "";
    const city = hotel.city || "";
    const subArea = hotel.subArea || "";
    const priceText = hotel.priceText || "";

    html += `
      <div class="hotel-item">
        <div>
          <strong>${escapeHtml(name)}</strong><br>
          <small>${escapeHtml(area)} ${escapeHtml(city)} ${escapeHtml(subArea)}</small><br>
          <small>${escapeHtml(priceText)}</small>
        </div>
        <button onclick="addRecord('${hotel.id}')">記録</button>
      </div>
    `;
  });

  html += `</div>`;

  content.innerHTML = html;
  setActiveTab("search");
}

function renderRecords() {
  let html = `
    <div class="card">
      <h2>自分の記録一覧</h2>
  `;

  if (state.records.length === 0) {
    html += `<p>記録はまだありません</p>`;
  }

  state.records.forEach((record) => {
    html += `
      <div class="record-item">
        <div>
          <strong>${escapeHtml(record.hotelName || record.hotel || "ホテル名なし")}</strong><br>
          <small>${escapeHtml(record.area || "")} ${escapeHtml(record.city || "")}</small>
        </div>
        <button onclick="deleteRecord('${record.id}')">削除</button>
      </div>
    `;
  });

  html += `</div>`;

  content.innerHTML = html;
  setActiveTab("record");
}

function renderRanking() {
  content.innerHTML = `
    <div class="card">
      <h2>ランキング</h2>
      <p>自分の記録数：${state.records.length}</p>
      <p>全体ランキングは後で追加。</p>
    </div>
  `;

  setActiveTab("ranking");
}

function renderMyPage() {
  content.innerHTML = `
    <div class="card">
      <h2>マイページ</h2>
      <p>${escapeHtml(state.user.email)}</p>
      <p>記録数：${state.records.length}</p>
      <button onclick="logout()">ログアウト</button>
    </div>
  `;

  setActiveTab("mypage");
}

// =========================
// window登録
// =========================

window.showPage = showPage;
window.signup = signup;
window.login = login;
window.logout = logout;
window.addRecord = addRecord;
window.deleteRecord = deleteRecord;
