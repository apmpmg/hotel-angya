import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const hotels = ["アパホテル", "東横イン", "ドーミーイン", "ルートイン"];

let records = [];

async function loadRecords() {
  const snap = await getDocs(collection(db, "records"));
  records = [];
  snap.forEach((d) => {
    records.push({ id: d.id, ...d.data() });
  });
  showHome();
}

async function addRecord(name) {
  await addDoc(collection(db, "records"), {
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
  let html = `<div class="card"><h2>記録一覧</h2>`;
  if (records.length === 0) html += `<p>記録はまだありません</p>`;

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
      <p>記録数: ${records.length}</p>
    </div>
  `;
}

function showMyPage() {
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>マイページ</h2>
      <p>記録数: ${records.length}</p>
    </div>
  `;
}

window.showPage = showPage;
window.addRecord = addRecord;
window.deleteRecord = deleteRecord;

loadRecords();
