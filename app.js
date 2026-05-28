import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("Firebase接続OK");

const hotels = [
  "アパホテル",
  "東横イン",
  "ドーミーイン",
  "ルートイン"
];

let records = JSON.parse(localStorage.getItem("records")) || [];

function saveRecords() {
  localStorage.setItem("records", JSON.stringify(records));
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
      <p>ホテル巡礼記録サイトへようこそ</p>
    </div>
  `;
}

function showSearch() {
  let html = `
    <div class="card">
      <h2>検索</h2>
  `;

  hotels.forEach(hotel => {
    html += `
      <div class="hotel-item">
        ${hotel}
        <button onclick="addRecord('${hotel}')">記録</button>
      </div>
    `;
  });

  html += `</div>`;

  document.getElementById("content").innerHTML = html;
}

function addRecord(hotel) {
  records.push({
    hotel,
    date: new Date().toLocaleDateString()
  });

  saveRecords();

  alert(hotel + " を記録しました");
}

function showRecord() {
  let html = `
    <div class="card">
      <h2>記録一覧</h2>
  `;

  if (records.length === 0) {
    html += `<p>まだ記録がありません</p>`;
  }

  records.forEach((r, index) => {
    html += `
      <div class="record-item">
        ${r.hotel} (${r.date})
        <button onclick="deleteRecord(${index})">削除</button>
      </div>
    `;
  });

  html += `</div>`;

  document.getElementById("content").innerHTML = html;
}

function deleteRecord(index) {
  if (!confirm("削除しますか？")) return;

  records.splice(index, 1);

  saveRecords();

  showRecord();
}

function showRanking() {
  const visitedHotels = new Set(records.map(r => r.hotel));

  const rate = hotels.length
    ? Math.round((visitedHotels.size / hotels.length) * 100)
    : 0;

  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>ランキング</h2>
      <p>訪問ホテル数: ${visitedHotels.size}</p>
      <p>記録数: ${records.length}</p>
      <p>制覇率: ${rate}%</p>
    </div>
  `;
}

function showMyPage() {
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>マイページ</h2>
      <p>Firebase接続準備OK</p>
    </div>
  `;
}

showHome();

window.showPage = showPage;
window.addRecord = addRecord;
window.deleteRecord = deleteRecord;
