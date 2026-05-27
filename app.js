const hotels = [
  {
    id: 1,
    name: "HOTEL BaliAn Resort 新宿本店",
    area: "新宿 / 歌舞伎町",
    price: "10000-20000",
    rating: 4.5,
    visits: 0,
    tags: ["人気","清潔感","アメニティ"]
  },
  {
    id: 2,
    name: "HOTEL PASHA",
    area: "新宿 / 歌舞伎町",
    price: "9000-18000",
    rating: 4.2,
    visits: 0,
    tags: ["有名","豪華","サウナ"]
  },
  {
    id: 3,
    name: "HOTEL D-WAVE",
    area: "新宿 / 歌舞伎町",
    price: "7000-13000",
    rating: 4.0,
    visits: 0,
    tags: ["コスパ","入りやすい"]
  },
  {
    id: 4,
    name: "HOTEL PERRIER",
    area: "新宿 / 歌舞伎町",
    price: "8000-15000",
    rating: 3.9,
    visits: 0,
    tags: ["駅近","清潔感"]
  }
];

let records = JSON.parse(localStorage.getItem("records") || "[]");

function saveRecords(){
  localStorage.setItem("records", JSON.stringify(records));
}

function showPage(page){
  if(page === "home") showHome();
  if(page === "search") showSearch();
  if(page === "record") showRecord();
  if(page === "ranking") showRanking();
  if(page === "mypage") showMypage();
}

function showHome(){
  const visitedHotelIds = new Set(records.map(r => r.hotelId));
  const rate = hotels.length ? Math.round((visitedHotelIds.size / hotels.length) * 100) : 0;

  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>行脚ステータス</h2>
      <div class="stat-grid">
        <div><strong>${records.length}</strong><span class="sub">記録数</span></div>
        <div><strong>${visitedHotelIds.size}</strong><span class="sub">訪問ホテル</span></div>
        <div><strong>${rate}%</strong><span class="sub">制覇率</span></div>
      </div>
    </div>

    <div class="card">
      <h2>次にやること</h2>
      <p class="sub">検索からホテルを選んで「行った記録」を追加。</p>
    </div>
  `;
}

function showSearch(){
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>ホテル検索</h2>
      <input id="searchInput" placeholder="ホテル名・タグで検索" oninput="renderHotelList()">
    </div>
    <div id="hotelList"></div>
  `;
  renderHotelList();
}

function renderHotelList(){
  const keyword = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const list = hotels.filter(h => {
    const text = (h.name + h.area + h.tags.join(" ")).toLowerCase();
    return text.includes(keyword);
  });

  document.getElementById("hotelList").innerHTML = list.map(h => `
    <div class="card hotel-card">
      <div class="hotel-title">${h.name}</div>
      <p class="sub">${h.area}</p>
      <p class="sub">料金帯：${h.price}</p>
      <p class="sub">評価：${h.rating}</p>
      <div>${h.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <button class="detail-button" onclick="showHotelDetail(${h.id})">詳細を見る</button>
    </div>
  `).join("");
}

function showHotelDetail(id){
  const h = hotels.find(x => x.id === id);
  document.getElementById("content").innerHTML = `
    <div class="card">
      <button onclick="showSearch()">← 検索に戻る</button>
      <h2>${h.name}</h2>
      <p class="sub">${h.area}</p>
      <p>料金帯：${h.price}</p>
      <p>評価：${h.rating}</p>
      <div>${h.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    </div>

    <div class="card">
      <h2>行った記録を追加</h2>
      <input id="visitDate" type="date">
      <select id="visitRating">
        <option value="5">★★★★★ 5</option>
        <option value="4">★★★★ 4</option>
        <option value="3">★★★ 3</option>
        <option value="2">★★ 2</option>
        <option value="1">★ 1</option>
      </select>
      <textarea id="visitMemo" placeholder="メモ"></textarea>
      <button class="detail-button" onclick="addRecord(${h.id})">保存する</button>
    </div>
  `;
}

function addRecord(hotelId){
  const hotel = hotels.find(h => h.id === hotelId);
  const date = document.getElementById("visitDate").value || "日付不明";
  const rating = document.getElementById("visitRating").value;
  const memo = document.getElementById("visitMemo").value;

  records.unshift({
    hotelId,
    hotelName: hotel.name,
    date,
    rating,
    memo
  });

  saveRecords();
  alert("記録しました");
  showRecord();
}

function showRecord(){
  if(records.length === 0){
    document.getElementById("content").innerHTML = `
      <div class="card">
        <h2>行脚記録</h2>
        <p class="sub">まだ記録がありません。</p>
      </div>
    `;
    return;
  }

  document.getElementById("content").innerHTML = `
    <div class="card"><h2>行脚記録</h2></div>
    ${records.map((r,i) => `
      <div class="card">
        <div class="hotel-title">${r.hotelName}</div>
        <p class="sub">日付：${r.date}</p>
        <p class="sub">評価：${"★".repeat(Number(r.rating))}</p>
        <p>${r.memo || ""}</p>
        <button onclick="deleteRecord(${i})">削除</button>
      </div>
    `).join("")}
  `;
}

function deleteRecord(index){
  if(!confirm("削除しますか？")) return;
  records.splice(index,1);
  saveRecords();
  showRecord();
}

function showRanking(){
  const visitedHotelIds = new Set(records.map(r => r.hotelId));
  const rate = hotels.length ? Math.round((visitedHotelIds.size / hotels.length) * 100) : 0;

  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>ランキング</h2>
      <p class="sub">今はローカル版。Firebase接続後に全体ランキング化。</p>
    </div>
    <div class="card">
      <h3>あなたの行脚</h3>
      <p>記録数：${records.length}</p>
      <p>訪問ホテル：${visitedHotelIds.size}</p>
      <p>制覇率：${rate}%</p>
    </div>
  `;
}

function showMypage(){
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>マイページ</h2>
      <p class="sub">ログイン機能はFirebase接続時に追加。</p>
    </div>
  `;
}

showHome();
