import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
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
  role: null,
  hotels: [],
  records: []
};

const content = document.getElementById("content");

onAuthStateChanged(auth, async (user) => {

  state.user = user;

  if (!user) {

    state.role = null;
    state.hotels = [];
    state.records = [];

    renderLogin();

    return;
  }

  await loadUserRole();

  await loadHotels();

  await loadRecords();

  renderHome();
});

async function loadUserRole() {

  if (!state.user) return;

  const userRef = doc(
    db,
    "users",
    state.user.uid
  );

  const snap = await getDoc(userRef);

  if (!snap.exists()) {

    state.role = "user";

    return;
  }

  state.role =
    snap.data().role || "user";
}

async function loadHotels() {

  const snap = await getDocs(
    collection(db, "hotels")
  );

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

  const email =
    document.getElementById("email")
    .value
    .trim();

  const password =
    document.getElementById("password")
    .value;

  if (!email || !password) {

    alert(
      "メールアドレスとパスワードを入力してください"
    );

    return;
  }

  if (password.length < 6) {

    alert(
      "パスワードは6文字以上にしてください"
    );

    return;
  }

  await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  alert("登録しました");
}

async function login() {

  const email =
    document.getElementById("email")
    .value
    .trim();

  const password =
    document.getElementById("password")
    .value;

  if (!email || !password) {

    alert(
      "メールアドレスとパスワードを入力してください"
    );

    return;
  }

  await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  alert("ログインしました");
}

async function logout() {

  await signOut(auth);

  alert("ログアウトしました");
}

async function addRecord(hotelId) {

  if (!state.user) {

    alert("ログインしてください");

    return;
  }

  const hotel = state.hotels.find(
    (h) => h.id === hotelId
  );

  if (!hotel) {

    alert(
      "ホテル情報が見つかりません"
    );

    return;
  }

  await addDoc(
    collection(db, "records"),
    {
      uid: state.user.uid,

      email: state.user.email,

      hotelId: hotel.id,

      hotelName: hotel.name,

      area: hotel.area || "",

      city: hotel.city || "",

      createdAt: Date.now()
    }
  );

  alert("記録しました");

  await loadRecords();

  renderRecords();
}

async function deleteRecord(recordId) {

  if (!confirm("削除しますか？"))
    return;

  await deleteDoc(
    doc(db, "records", recordId)
  );

  await loadRecords();

  renderRecords();
}

function showPage(page) {

  if (!state.user) {

    renderLogin();

    return;
  }

  if (page === "home")
    renderHome();

  if (page === "search")
    renderSearch();

  if (page === "record")
    renderRecords();

  if (page === "ranking")
    renderRanking();

  if (page === "mypage")
    renderMyPage();

  setActiveTab(page);
}

function setActiveTab(page) {

  document
    .querySelectorAll(".nav button")
    .forEach((button) => {

      button.classList.remove(
        "active"
      );
    });

  document
    .querySelectorAll(".nav button")
    .forEach((button) => {

      if (
        button.dataset.page === page
      ) {

        button.classList.add(
          "active"
        );
      }
    });
}

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
        ${state.user.email}
      </p>

      <p>
        権限：
        ${state.role}
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
        ホテルデータがまだありません
      </p>
    `;
  }

  state.hotels.forEach((hotel) => {

    html += `
      <div class="hotel-item">

        ${hotel.imageUrl
          ? `
            <img
              class="hotel-thumb"
              src="${hotel.imageUrl}"
            >
          `
          : `
            <div class="hotel-thumb"></div>
          `
        }

        <div class="hotel-info">

          <strong>
            ${hotel.name}
          </strong>

          <small>
            ${hotel.area || ""}
            ${hotel.city || ""}
            ${hotel.subArea || ""}
          </small>

          <br>

          <small>
            ${hotel.priceText || ""}
          </small>

        </div>

        <button
          onclick="addRecord('${hotel.id}')"
        >
          記録
        </button>

      </div>
    `;
  });

  html += `
    </div>
  `;

  content.innerHTML = html;

  setActiveTab("search");
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
            ${record.hotelName || "ホテル名なし"}
          </strong>

          <br>

          <small>
            ${record.area || ""}
            ${record.city || ""}
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

  html += `
    </div>
  `;

  content.innerHTML = html;

  setActiveTab("record");
}

function renderRanking() {

  content.innerHTML = `
    <div class="card">

      <h2>ランキング</h2>

      <p>
        自分の記録数：
        ${state.records.length}
      </p>

      <p>
        全体ランキングは後で追加。
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
        ${state.user.email}
      </p>

      <p>
        権限：
        ${state.role}
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

window.showPage = showPage;

window.signup = signup;

window.login = login;

window.logout = logout;

window.addRecord = addRecord;

window.deleteRecord = deleteRecord;
