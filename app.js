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
  records: []
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

// =========================
// Auth監視
// =========================

onAuthStateChanged(auth, async (user) => {
  state.user = user;

  if (!user) {
    state.hotels = [];
    state.records = [];
    renderLogin();
    return;
  }

  try {
    setLoading("データ読み込み中...");

    await loadHotels();
    await loadRecords();

    renderHome();
  } catch (error) {
    console.error(error);

    content.innerHTML = `
      <div class="card">
        <h2>エラー</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
});

// =========================
// Firestore
// =========================

async function loadHotels() {
  const snap = await getDocs(collection(db, "hotels"));

  state.hotels = snap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));

  console.log("hotels", state.hotels);
}

async function loadRecords() {
  if (!state.user) return;

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

  console.log("records", state.records);
}

// =========================
// Auth
// =========================

async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("入力してください");
    return;
  }

  if (password.length < 6) {
    alert("6文字以上必要です");
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
    alert("入力してください");
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
// Records
// =========================

async function addRecord(hotelId) {
  if (!state.user) {
    alert("ログインしてください");
    return;
  }

  const hotel = state.hotels.find((h) => h.id === hotelId);

  if (!hotel) {
    alert("ホテルが見つかりません");
    return;
  }

  try {
    await addDoc(collection(db, "records"), {
      uid: state.user.uid,
      email: state.user.email,
      hotelId: hotel.id,
      hotelName: hotel.name || "名称未設定",
      area: hotel.area || "",
      city: hotel.city || "",
      createdAt: Date.now()
    });

    await loadRecords();

    alert("記録しました");
  } catch (error) {
    alert(error.message);
  }
}

async function deleteRecord(recordId) {
  if (!confirm("削除しますか？")) return;

  try {
    await deleteDoc(doc(db, "records", recordId));

    await loadRecords();

    renderRecords();
  } catch (error) {
    alert(error.message);
  }
}

// =========================
// Navigation
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

      <h2>ログイン</h2>

      <input
        id="email"
        type="email"
        placeholder="メールアドレス"
      >

      <input
        id="password"
        type="password"
        placeholder="パスワード"
      >

      <button onclick="login()">
        ログイン
      </button>

      <button onclick="signup()">
        新規登録
      </button>

    </div>
  `;
}

function renderHome() {
  content.innerHTML = `
    <div class="card">

      <h2>ホーム</h2>

      <p>
        ログイン中：
        ${escapeHtml(state.user.email)}
      </p>

      <p>
        登録ホテル数：
        ${state.hotels.length}
      </p>

      <p>
        自分の記録数：
        ${state.records.length}
      </p>

      <button onclick="showPage('search')">
        ホテルを見る
      </button>

    </div>
  `;

  setActiveTab("home");
}

function renderSearch() {
  let html = `
    <div class="card">

      <h2>ホテル検索</h2>

      <p>
        登録ホテル数：
        ${state.hotels.length}
      </p>
  `;

  if (state.hotels.length === 0) {
    html += `
      <p>
        ホテルデータがありません
      </p>
    `;
  }

  state.hotels.forEach((hotel) => {
    const name =
      hotel.name ||
      hotel.hotelName ||
      "名称未設定";

    const area = hotel.area || "";
    const city = hotel.city || "";
    const subArea = hotel.subArea || "";
    const priceText = hotel.priceText || "";

    html += `
      <div
        class="hotel-item"
        onclick="renderHotelDetail('${hotel.id}')"
      >

        <div>

          <strong>
            ${escapeHtml(name)}
          </strong>

          <br>

          <small>
            ${escapeHtml(area)}
            ${escapeHtml(city)}
            ${escapeHtml(subArea)}
          </small>

          <br>

          <small>
            ${escapeHtml(priceText)}
          </small>

        </div>

        <button
          onclick="
            event.stopPropagation();
            addRecord('${hotel.id}')
          "
        >
          記録
        </button>

      </div>
    `;
  });

  html += `</div>`;

  content.innerHTML = html;

  setActiveTab("search");
}

function renderHotelDetail(hotelId) {
  const hotel = state.hotels.find((h) => h.id === hotelId);

  if (!hotel) {
    alert("ホテルが見つかりません");
    renderSearch();
    return;
  }

  const name =
    hotel.name ||
    hotel.hotelName ||
    "名称未設定";

  const area = hotel.area || "";
  const city = hotel.city || "";
  const subArea = hotel.subArea || "";
  const priceText = hotel.priceText || "";
  const description =
    hotel.description ||
    "説明はまだありません";

  content.innerHTML = `
    <div class="card">

      <button onclick="renderSearch()">
        ← 戻る
      </button>

      <h2>
        ${escapeHtml(name)}
      </h2>

      <p>
        ${escapeHtml(area)}
        ${escapeHtml(city)}
        ${escapeHtml(subArea)}
      </p>

      <p>
        ${escapeHtml(priceText)}
      </p>

      <hr>

      <p>
        ${escapeHtml(description)}
      </p>

      <button onclick="addRecord('${hotel.id}')">
        このホテルを記録する
      </button>

    </div>
  `;
}

function renderRecords() {
  let html = `
    <div class="card">

      <h2>自分の記録一覧</h2>
  `;

  if (state.records.length === 0) {
    html += `
      <p>
        記録はまだありません
      </p>
    `;
  }

  state.records.forEach((record) => {
    html += `
      <div class="record-item">

        <div>

          <strong>
            ${escapeHtml(
              record.hotelName ||
              "ホテル名なし"
            )}
          </strong>

          <br>

          <small>
            ${escapeHtml(record.area || "")}
            ${escapeHtml(record.city || "")}
          </small>

        </div>

        <button
          onclick="deleteRecord('${record.id}')"
        >
          削除
        </button>

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

      <p>
        全体ランキングは今後追加予定
      </p>

    </div>
  `;

  setActiveTab("ranking");
}

function renderMyPage() {
  content.innerHTML = `
    <div class="card">

      <h2>マイページ</h2>

      <p>
        ${escapeHtml(state.user.email)}
      </p>

      <p>
        記録数：
        ${state.records.length}
      </p>

      <button onclick="logout()">
        ログアウト
      </button>

    </div>
  `;

  setActiveTab("mypage");
}

// =========================
// Window
// =========================

window.showPage = showPage;
window.signup = signup;
window.login = login;
window.logout = logout;
window.addRecord = addRecord;
window.deleteRecord = deleteRecord;
window.renderHotelDetail = renderHotelDetail;
