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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const state = {
  user: null,
  hotels: [],
  records: [],
  searchText: ""
};

const content = document.getElementById("content");

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

onAuthStateChanged(auth, async (user) => {
  state.user = user;

  if (!user) {
    state.hotels = [];
    state.records = [];
    state.searchText = "";
    renderLogin();
    return;
  }

  try {
    setLoading("データ読み込み中...");
    await loadHotels();
    await loadRecords();
    renderHome();
  } catch (error) {
    content.innerHTML = `
      <div class="card">
        <h2>エラー</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
});

async function loadHotels() {
  const snap = await getDocs(collection(db, "hotels"));

  state.hotels = snap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));
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
}

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
      hotelName: hotel.name || hotel.hotelName || "名称未設定",
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

function updateSearchText(value) {
  state.searchText = value;
  renderHotelListOnly();
}

function clearSearch() {
  state.searchText = "";

  const input = document.getElementById("hotelSearchInput");
  if (input) {
    input.value = "";
    input.focus();
  }

  renderHotelListOnly();
}

function getFilteredHotels() {
  const keyword = state.searchText.trim().toLowerCase();

  if (!keyword) {
    return state.hotels;
  }

  return state.hotels.filter((hotel) => {
    const text = [
      hotel.name,
      hotel.hotelName,
      hotel.area,
      hotel.city,
      hotel.subArea,
      hotel.priceText,
      hotel.description
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(keyword);
  });
}

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

function renderLogin() {
  content.innerHTML = `
    <div class="card">
      <h2>ログイン</h2>

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

      <button onclick="showPage('search')">
        ホテルを見る
      </button>
    </div>
  `;

  setActiveTab("home");
}

function renderSearch() {
  content.innerHTML = `
    <div class="card">
      <h2>ホテル検索</h2>

      <input
        id="hotelSearchInput"
        type="search"
        value="${escapeHtml(state.searchText)}"
        placeholder="ホテル名・エリアで検索"
        oninput="updateSearchText(this.value)"
      >

      <div id="hotelSearchStatus"></div>

      <div id="hotelList"></div>
    </div>
  `;

  renderHotelListOnly();
  setActiveTab("search");
}

function renderHotelListOnly() {
  const list = document.getElementById("hotelList");
  const status = document.getElementById("hotelSearchStatus");

  if (!list || !status) return;

  const filteredHotels = getFilteredHotels();

  status.innerHTML = `
    <p>
      表示件数：${filteredHotels.length} / ${state.hotels.length}
    </p>

    ${
      state.searchText
        ? `<button onclick="clearSearch()">検索をクリア</button>`
        : ""
    }
  `;

  let html = "";

  if (state.hotels.length === 0) {
    html += `<p>ホテルデータがありません</p>`;
  } else if (filteredHotels.length === 0) {
    html += `<p>該当するホテルがありません</p>`;
  }

  filteredHotels.forEach((hotel) => {
    const name = hotel.name || hotel.hotelName || "名称未設定";
    const area = hotel.area || "";
    const city = hotel.city || "";
    const subArea = hotel.subArea || "";
    const priceText = hotel.priceText || "";
    const imageUrl = hotel.imageUrl || "";

    html += `
      <div class="hotel-item" onclick="renderHotelDetail('${hotel.id}')">

        ${
          imageUrl
            ? `<img class="hotel-thumb" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}">`
            : `<div class="hotel-thumb"></div>`
        }

        <div class="hotel-info">
          <strong>${escapeHtml(name)}</strong>
          <small>
            ${escapeHtml(area)}
            ${escapeHtml(city)}
            ${escapeHtml(subArea)}
          </small>
          <br>
          <small>${escapeHtml(priceText)}</small>
        </div>

        <button onclick="event.stopPropagation(); addRecord('${hotel.id}')">
          記録
        </button>

      </div>
    `;
  });

  list.innerHTML = html;
}

function renderHotelDetail(hotelId) {
  const hotel = state.hotels.find((h) => h.id === hotelId);

  if (!hotel) {
    alert("ホテルが見つかりません");
    renderSearch();
    return;
  }

  const name = hotel.name || hotel.hotelName || "名称未設定";
  const area = hotel.area || "";
  const city = hotel.city || "";
  const subArea = hotel.subArea || "";
  const priceText = hotel.priceText || "";
  const description = hotel.description || "説明はまだありません";
  const imageUrl = hotel.imageUrl || "";

  content.innerHTML = `
    <div class="card">

      <button onclick="renderSearch()">← 戻る</button>

      ${
        imageUrl
          ? `<img class="hotel-detail-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}">`
          : ""
      }

      <h2>${escapeHtml(name)}</h2>

      <p>
        ${escapeHtml(area)}
        ${escapeHtml(city)}
        ${escapeHtml(subArea)}
      </p>

      <p>${escapeHtml(priceText)}</p>

      <hr>

      <p>${escapeHtml(description)}</p>

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
    html += `<p>記録はまだありません</p>`;
  }

  state.records.forEach((record) => {
    html += `
      <div class="record-item">

        <div>
          <strong>
            ${escapeHtml(record.hotelName || "ホテル名なし")}
          </strong>
          <br>
          <small>
            ${escapeHtml(record.area || "")}
            ${escapeHtml(record.city || "")}
          </small>
        </div>

        <button onclick="deleteRecord('${record.id}')">
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
      <p>全体ランキングは今後追加予定</p>
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

      <button onclick="logout()">
        ログアウト
      </button>
    </div>
  `;

  setActiveTab("mypage");
}

window.showPage = showPage;
window.signup = signup;
window.login = login;
window.logout = logout;
window.addRecord = addRecord;
window.deleteRecord = deleteRecord;
window.renderHotelDetail = renderHotelDetail;
window.updateSearchText = updateSearchText;
window.clearSearch = clearSearch;
