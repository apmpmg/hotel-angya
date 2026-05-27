// js/app.js
import {
  register,
  login,
  logout,
  fetchUserData,
  watchAuth
} from "./auth.js";

import {
  fetchHotels,
  filterHotels,
  fetchHotelById,
  addHotel,
  updateHotel,
  submitHotel,
  fetchPendingHotelSubmissions,
  approveHotelSubmission,
  rejectHotelSubmission
} from "./hotels.js";

import {
  addVisit,
  fetchMyVisits,
  fetchVisitById,
  updateVisit,
  deleteVisit
} from "./visits.js";

const screen = document.getElementById("screen");
const bottomNav = document.getElementById("bottomNav");

const state = {
  user: null,
  userData: null,
  hotels: []
};

watchAuth(async (user) => {
  if (!user) {
    state.user = null;
    state.userData = null;
    bottomNav.classList.add("hidden");
    renderLogin();
    return;
  }

  state.user = user;
  state.userData = await fetchUserData(user.uid);
  bottomNav.classList.remove("hidden");
  renderHome();
});

bottomNav.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    const screenName = button.dataset.screen;
    switch (screenName) {
      case "home": renderHome(); break;
      case "search": renderSearch(); break;
      case "visits": renderVisits(); break;
      case "ranking": renderRanking(); break;
      case "mypage": renderMyPage(); break;
    }
  });
});

function setActiveTab(screenName) {
  bottomNav.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenName);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderLogin() {
  screen.innerHTML = `
    <section>
      <h1 class="section-title">ホテル行脚</h1>
      <div class="card">
        <input id="loginEmail" class="input" type="email" placeholder="メールアドレス" />
        <input id="loginPassword" class="input" type="password" placeholder="パスワード" />
        <button id="loginButton" class="primary-button">ログイン</button>
        <button id="goRegisterButton" class="text-button">新規登録はこちら</button>
      </div>
    </section>
  `;

  document.getElementById("loginButton").addEventListener("click", async () => {
    try {
      await login({
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
      });
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("goRegisterButton").addEventListener("click", () => renderRegister());
}

function renderRegister() {
  screen.innerHTML = `
    <section>
      <button class="text-button" id="backToLogin">← ログインへ戻る</button>
      <h1 class="section-title">新規登録</h1>
      <div class="card">
        <input id="registerNickname" class="input" type="text" placeholder="ニックネーム" />
        <input id="registerEmail" class="input" type="email" placeholder="メールアドレス" />
        <input id="registerPassword" class="input" type="password" placeholder="パスワード（6文字以上）" />
        <button id="registerButton" class="primary-button">登録する</button>
      </div>
    </section>
  `;

  document.getElementById("backToLogin").addEventListener("click", renderLogin);

  document.getElementById("registerButton").addEventListener("click", async () => {
    try {
      await register({
        nickname: document.getElementById("registerNickname").value.trim(),
        email: document.getElementById("registerEmail").value.trim(),
        password: document.getElementById("registerPassword").value
      });
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderHome() {
  setActiveTab("home");
  screen.innerHTML = `<section><h1 class="section-title">ホーム</h1><div id="homeContent"><div class="card"><p class="sub-text">読み込み中...</p></div></div></section>`;

  try {
    if (state.hotels.length === 0) state.hotels = await fetchHotels();
    const visits = await fetchMyVisits(state.user.uid);
    const recentVisits = visits.slice(0, 3);
    const visitedHotelIds = new Set(visits.map(v => v.hotelId));
    const completionRate = state.hotels.length ? Math.round((visitedHotelIds.size / state.hotels.length) * 100) : 0;

    document.getElementById("homeContent").innerHTML = `
      <div class="card">
        <h2>行脚ステータス</h2>
        <div class="stats-grid">
          <div><strong>${visits.length}</strong><p class="sub-text">記録数</p></div>
          <div><strong>${visitedHotelIds.size}</strong><p class="sub-text">訪問ホテル</p></div>
          <div><strong>${completionRate}%</strong><p class="sub-text">新宿制覇率</p></div>
        </div>
      </div>
      <div class="card">
        <h2>最近の記録</h2>
        ${recentVisits.length === 0 ? `<p class="sub-text">まだ記録がありません</p>` : recentVisits.map((visit) => {
          const hotel = state.hotels.find(h => h.id === visit.hotelId);
          return `<div class="mini-row"><div><strong>${escapeHtml(hotel?.name || "ホテル名不明")}</strong><p class="sub-text">評価：${"★".repeat(visit.rating || 0)}</p></div></div>`;
        }).join("")}
      </div>
      <div class="card">
        <h2>ショートカット</h2>
        <button class="primary-button" id="homeSearchButton">ホテルを探す</button>
        <button class="text-button" id="homeVisitButton">行脚記録を見る</button>
      </div>
    `;

    document.getElementById("homeSearchButton").addEventListener("click", renderSearch);
    document.getElementById("homeVisitButton").addEventListener("click", renderVisits);
  } catch (error) {
    document.getElementById("homeContent").innerHTML = `<div class="card"><p class="sub-text">ホームの読み込みに失敗しました</p></div>`;
    console.error(error);
  }
}

async function renderSearch() {
  setActiveTab("search");
  screen.innerHTML = `
    <section>
      <h1 class="section-title">ホテル検索</h1>
      <input id="hotelSearchInput" class="input" type="text" placeholder="ホテル名・エリア・タグで検索" />
      <button class="text-button" id="submitHotelButton">ホテル追加を申請する</button>
      <div id="hotelList"><div class="card"><p class="sub-text">読み込み中...</p></div></div>
    </section>
  `;

  try {
    if (state.hotels.length === 0) state.hotels = await fetchHotels();
    renderHotelList(state.hotels);

    document.getElementById("hotelSearchInput").addEventListener("input", (e) => {
      renderHotelList(filterHotels(state.hotels, e.target.value));
    });

    document.getElementById("submitHotelButton").addEventListener("click", renderHotelSubmission);
  } catch (error) {
    document.getElementById("hotelList").innerHTML = `<div class="card"><p class="sub-text">ホテル一覧の取得に失敗しました</p></div>`;
    console.error(error);
  }
}

function renderHotelList(hotels) {
  const hotelList = document.getElementById("hotelList");
  if (!hotels.length) {
    hotelList.innerHTML = `<div class="card"><p class="sub-text">該当するホテルがありません</p></div>`;
    return;
  }

  hotelList.innerHTML = hotels.map((hotel) => `
    <div class="card hotel-card" data-hotel-id="${hotel.id}">
      <div class="hotel-name">${escapeHtml(hotel.name)}</div>
      <p class="sub-text">${escapeHtml(hotel.area || "")} / ${escapeHtml(hotel.subArea || "")}</p>
      <p class="sub-text">料金帯：${escapeHtml(hotel.priceRange || "未登録")}</p>
      <div>${(hotel.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
  `).join("");

  hotelList.querySelectorAll(".hotel-card").forEach((card) => {
    card.addEventListener("click", () => renderHotelDetail(card.dataset.hotelId));
  });
}

async function renderHotelDetail(hotelId) {
  screen.innerHTML = `<section><button class="text-button" id="backToSearch">← 検索へ戻る</button><h1 class="section-title">ホテル詳細</h1><div class="card"><p class="sub-text">読み込み中...</p></div></section>`;
  try {
    const hotel = await fetchHotelById(hotelId);
    screen.innerHTML = `
      <section>
        <button class="text-button" id="backToSearch">← 検索へ戻る</button>
        <h1 class="section-title">${escapeHtml(hotel.name)}</h1>
        <div class="card">
          <p class="sub-text">${escapeHtml(hotel.area || "")} / ${escapeHtml(hotel.subArea || "")}</p>
          <p>住所：${escapeHtml(hotel.address || "未登録")}</p>
          <p>最寄り：${escapeHtml(hotel.station || "未登録")}</p>
          <p>系列：${escapeHtml(hotel.chainName || "なし")}</p>
          <p>料金帯：${escapeHtml(hotel.priceRange || "未登録")}</p>
        </div>
        <div class="card">
          <h2>特徴</h2>
          <p>サウナ：${hotel.features?.sauna ? "あり" : "なし"}</p>
          <p>露天風呂：${hotel.features?.openAirBath ? "あり" : "なし"}</p>
          <p>清潔感：${hotel.features?.clean ? "あり" : "未評価"}</p>
          <p>料金情報：${hotel.features?.priceInfo ? "あり" : "なし"}</p>
        </div>
        <div class="card"><h2>タグ</h2><div>${(hotel.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></div>
        <button class="primary-button" id="addVisitButton">行った記録を追加</button>
      </section>
    `;

    document.getElementById("backToSearch").addEventListener("click", renderSearch);
    document.getElementById("addVisitButton").addEventListener("click", () => renderAddVisit(hotel.id));
  } catch (error) {
    alert(error.message);
    renderSearch();
  }
}

async function renderAddVisit(hotelId) {
  let hotel;
  try { hotel = await fetchHotelById(hotelId); } catch (error) { alert(error.message); renderSearch(); return; }

  screen.innerHTML = `
    <section>
      <button class="text-button" id="backToHotel">← ホテル詳細へ戻る</button>
      <h1 class="section-title">行った記録を追加</h1>
      <div class="card"><div class="hotel-name">${escapeHtml(hotel.name)}</div><p class="sub-text">${escapeHtml(hotel.area || "")} / ${escapeHtml(hotel.subArea || "")}</p></div>
      <div class="card">
        <label class="form-label">日付</label>
        <label class="check-row"><input id="dateUnknown" type="checkbox" checked />日付不明</label>
        <input id="visitedDate" class="input" type="date" disabled />
        <label class="form-label">日付の公開</label>
        <select id="dateVisibility" class="input" disabled>
          <option value="private">非公開</option>
          <option value="month">月だけ公開</option>
          <option value="full">日付まで公開</option>
        </select>
        <label class="form-label">評価</label>
        <select id="rating" class="input">
          <option value="">選択してください</option>
          <option value="5">★★★★★ 5</option><option value="4">★★★★ 4</option><option value="3">★★★ 3</option><option value="2">★★ 2</option><option value="1">★ 1</option>
        </select>
        <label class="form-label">メモ</label>
        <textarea id="memo" class="input textarea" placeholder="自分用メモ"></textarea>
        <label class="check-row"><input id="recordPublic" type="checkbox" />この記録を公開する</label>
        <label class="check-row"><input id="countForRanking" type="checkbox" />ランキングに反映する</label>
        <button class="primary-button" id="saveVisitButton">保存する</button>
      </div>
    </section>
  `;

  const dateUnknown = document.getElementById("dateUnknown");
  const visitedDate = document.getElementById("visitedDate");
  const dateVisibility = document.getElementById("dateVisibility");

  dateUnknown.addEventListener("change", () => {
    const unknown = dateUnknown.checked;
    visitedDate.disabled = unknown;
    dateVisibility.disabled = unknown;
    if (unknown) {
      visitedDate.value = "";
      dateVisibility.value = "private";
    }
  });

  document.getElementById("backToHotel").addEventListener("click", () => renderHotelDetail(hotelId));

  document.getElementById("saveVisitButton").addEventListener("click", async () => {
    try {
      const isUnknown = dateUnknown.checked;
      const isPublic = document.getElementById("recordPublic").checked;
      await addVisit({
        userId: state.user.uid,
        hotelId,
        visitedDateStatus: isUnknown ? "unknown" : "known",
        visitedDate: isUnknown ? null : visitedDate.value,
        dateVisibility: isUnknown ? "private" : dateVisibility.value,
        recordVisibility: isPublic ? "public" : "private",
        rating: document.getElementById("rating").value,
        memo: document.getElementById("memo").value.trim(),
        countForRanking: document.getElementById("countForRanking").checked
      });
      alert("記録を保存しました");
      renderVisits();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderVisits() {
  setActiveTab("visits");
  screen.innerHTML = `<section><h1 class="section-title">行脚記録</h1><div id="visitList"><div class="card"><p class="sub-text">読み込み中...</p></div></div></section>`;

  try {
    if (state.hotels.length === 0) state.hotels = await fetchHotels();
    const visits = await fetchMyVisits(state.user.uid);

    if (visits.length === 0) {
      document.getElementById("visitList").innerHTML = `<div class="card"><p class="sub-text">まだ記録がありません</p></div>`;
      return;
    }

    document.getElementById("visitList").innerHTML = visits.map((visit) => {
      const hotel = state.hotels.find(h => h.id === visit.hotelId);
      return `
        <div class="card visit-card" data-visit-id="${visit.id}">
          <div class="hotel-name">${escapeHtml(hotel?.name || "ホテル名不明")}</div>
          <p class="sub-text">${hotel ? `${escapeHtml(hotel.area || "")} / ${escapeHtml(hotel.subArea || "")}` : ""}</p>
          <p>評価：${"★".repeat(visit.rating || 0)}</p>
          <p class="sub-text">日付：${getVisitDateText(visit)}</p>
          <p class="sub-text">公開：${visit.recordVisibility === "public" ? "公開" : "非公開"}</p>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".visit-card").forEach((card) => {
      card.addEventListener("click", () => renderVisitDetail(card.dataset.visitId));
    });
  } catch (error) {
    document.getElementById("visitList").innerHTML = `<div class="card"><p class="sub-text">記録の取得に失敗しました</p></div>`;
    console.error(error);
  }
}

function getVisitDateText(visit) {
  if (visit.visitedDateStatus === "unknown") return "不明";
  if (!visit.visitedDate) return "不明";
  return escapeHtml(visit.visitedDate);
}

async function renderVisitDetail(visitId) {
  let visit;
  try { visit = await fetchVisitById(visitId); } catch (error) { alert(error.message); renderVisits(); return; }

  if (visit.userId !== state.user.uid) {
    alert("この記録は編集できません");
    renderVisits();
    return;
  }

  const hotel = state.hotels.find(h => h.id === visit.hotelId);
  const isUnknown = visit.visitedDateStatus === "unknown";

  screen.innerHTML = `
    <section>
      <button class="text-button" id="backToVisits">← 行脚記録へ戻る</button>
      <h1 class="section-title">記録編集</h1>
      <div class="card"><div class="hotel-name">${escapeHtml(hotel?.name || "ホテル名不明")}</div><p class="sub-text">${hotel ? `${escapeHtml(hotel.area || "")} / ${escapeHtml(hotel.subArea || "")}` : ""}</p></div>
      <div class="card">
        <label class="form-label">日付</label>
        <label class="check-row"><input id="editDateUnknown" type="checkbox" ${isUnknown ? "checked" : ""} />日付不明</label>
        <input id="editVisitedDate" class="input" type="date" value="${escapeHtml(visit.visitedDate || "")}" ${isUnknown ? "disabled" : ""} />
        <label class="form-label">日付の公開</label>
        <select id="editDateVisibility" class="input" ${isUnknown ? "disabled" : ""}>
          <option value="private" ${visit.dateVisibility === "private" ? "selected" : ""}>非公開</option>
          <option value="month" ${visit.dateVisibility === "month" ? "selected" : ""}>月だけ公開</option>
          <option value="full" ${visit.dateVisibility === "full" ? "selected" : ""}>日付まで公開</option>
        </select>
        <label class="form-label">評価</label>
        <select id="editRating" class="input">
          <option value="5" ${visit.rating == 5 ? "selected" : ""}>★★★★★ 5</option>
          <option value="4" ${visit.rating == 4 ? "selected" : ""}>★★★★ 4</option>
          <option value="3" ${visit.rating == 3 ? "selected" : ""}>★★★ 3</option>
          <option value="2" ${visit.rating == 2 ? "selected" : ""}>★★ 2</option>
          <option value="1" ${visit.rating == 1 ? "selected" : ""}>★ 1</option>
        </select>
        <label class="form-label">メモ</label>
        <textarea id="editMemo" class="input textarea">${escapeHtml(visit.memo || "")}</textarea>
        <label class="check-row"><input id="editRecordPublic" type="checkbox" ${visit.recordVisibility === "public" ? "checked" : ""} />この記録を公開する</label>
        <label class="check-row"><input id="editCountForRanking" type="checkbox" ${visit.countForRanking ? "checked" : ""} />ランキングに反映する</label>
        <button class="primary-button" id="updateVisitButton">更新する</button>
        <button class="danger-button" id="deleteVisitButton">削除する</button>
      </div>
    </section>
  `;

  const dateUnknown = document.getElementById("editDateUnknown");
  const visitedDate = document.getElementById("editVisitedDate");
  const dateVisibility = document.getElementById("editDateVisibility");

  dateUnknown.addEventListener("change", () => {
    const unknown = dateUnknown.checked;
    visitedDate.disabled = unknown;
    dateVisibility.disabled = unknown;
    if (unknown) {
      visitedDate.value = "";
      dateVisibility.value = "private";
    }
  });

  document.getElementById("backToVisits").addEventListener("click", renderVisits);

  document.getElementById("updateVisitButton").addEventListener("click", async () => {
    try {
      const unknown = dateUnknown.checked;
      await updateVisit(visitId, {
        visitedDateStatus: unknown ? "unknown" : "known",
        visitedDate: unknown ? null : visitedDate.value,
        dateVisibility: unknown ? "private" : dateVisibility.value,
        rating: Number(document.getElementById("editRating").value),
        memo: document.getElementById("editMemo").value.trim(),
        recordVisibility: document.getElementById("editRecordPublic").checked ? "public" : "private",
        countForRanking: document.getElementById("editCountForRanking").checked
      });
      alert("更新しました");
      renderVisits();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("deleteVisitButton").addEventListener("click", async () => {
    if (!confirm("この記録を削除しますか？")) return;
    try {
      await deleteVisit(visitId);
      alert("削除しました");
      renderVisits();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderRanking() {
  setActiveTab("ranking");
  screen.innerHTML = `<section><h1 class="section-title">ランキング</h1><div id="rankingContent"><div class="card"><p class="sub-text">読み込み中...</p></div></div></section>`;

  try {
    if (state.hotels.length === 0) state.hotels = await fetchHotels();
    const visits = await fetchMyVisits(state.user.uid);
    const rankingVisits = visits.filter(v => v.countForRanking);
    const visitedHotelIds = new Set(rankingVisits.map(v => v.hotelId));
    const totalHotels = state.hotels.length;
    const completionRate = totalHotels ? Math.round((visitedHotelIds.size / totalHotels) * 100) : 0;

    document.getElementById("rankingContent").innerHTML = `
      <div class="card rank-top">
        <h2>あなたの行脚ステータス</h2>
        <div class="stats-grid">
          <div><strong>${rankingVisits.length}</strong><p class="sub-text">対象記録</p></div>
          <div><strong>${visitedHotelIds.size}</strong><p class="sub-text">訪問ホテル</p></div>
          <div><strong>${completionRate}%</strong><p class="sub-text">新宿制覇率</p></div>
        </div>
      </div>
      <div class="card"><h2>全体ランキング</h2><p class="sub-text">全体ランキングはPCでCloud Functionsを導入してから追加します。</p></div>
    `;
  } catch (error) {
    document.getElementById("rankingContent").innerHTML = `<div class="card"><p class="sub-text">ランキング情報の取得に失敗しました</p></div>`;
    console.error(error);
  }
}

async function renderMyPage() {
  setActiveTab("mypage");

  const isAdmin = state.userData?.role === "admin";
  const isEditor = state.userData?.role === "editor";

  screen.innerHTML = `<section><h1 class="section-title">マイページ</h1><div id="mypageContent"><div class="card"><p class="sub-text">読み込み中...</p></div></div></section>`;

  try {
    if (state.hotels.length === 0) state.hotels = await fetchHotels();
    const visits = await fetchMyVisits(state.user.uid);
    const visitedHotelIds = new Set(visits.map(v => v.hotelId));
    const completionRate = state.hotels.length ? Math.round((visitedHotelIds.size / state.hotels.length) * 100) : 0;

    document.getElementById("mypageContent").innerHTML = `
      <div class="card">
        <p>ニックネーム：${escapeHtml(state.userData?.nickname || "未設定")}</p>
        <p class="sub-text">権限：${escapeHtml(state.userData?.role || "user")}</p>
      </div>
      <div class="card">
        <h2>行脚ステータス</h2>
        <div class="stats-grid">
          <div><strong>${visits.length}</strong><p class="sub-text">記録数</p></div>
          <div><strong>${visitedHotelIds.size}</strong><p class="sub-text">訪問ホテル</p></div>
          <div><strong>${completionRate}%</strong><p class="sub-text">新宿制覇率</p></div>
        </div>
      </div>
      ${isAdmin || isEditor ? `
        <div class="card">
          <h2>管理メニュー</h2>
          <button class="primary-button" id="hotelAdminButton">ホテル管理</button>
          ${isAdmin ? `<button class="text-button" id="submissionAdminButton">申請確認</button>` : ""}
        </div>
      ` : ""}
      <button class="primary-button" id="logoutButton">ログアウト</button>
    `;

    const hotelAdminButton = document.getElementById("hotelAdminButton");
    if (hotelAdminButton) hotelAdminButton.addEventListener("click", renderHotelAdmin);

    const submissionAdminButton = document.getElementById("submissionAdminButton");
    if (submissionAdminButton) submissionAdminButton.addEventListener("click", renderSubmissionAdmin);

    document.getElementById("logoutButton").addEventListener("click", async () => await logout());
  } catch (error) {
    document.getElementById("mypageContent").innerHTML = `<div class="card"><p class="sub-text">マイページの取得に失敗しました</p></div>`;
    console.error(error);
  }
}

function renderHotelSubmission() {
  screen.innerHTML = `
    <section>
      <button class="text-button" id="backToSearch">← 検索へ戻る</button>
      <h1 class="section-title">ホテル追加申請</h1>
      <div class="card">
        <label class="form-label">ホテル名</label><input id="submitHotelName" class="input" type="text" placeholder="ホテル名" />
        <label class="form-label">エリア</label><input id="submitHotelArea" class="input" type="text" value="新宿" />
        <label class="form-label">細かいエリア</label><input id="submitHotelSubArea" class="input" type="text" placeholder="歌舞伎町など" />
        <label class="form-label">住所</label><input id="submitHotelAddress" class="input" type="text" placeholder="わかる範囲でOK" />
        <label class="form-label">最寄り駅</label><input id="submitHotelStation" class="input" type="text" placeholder="新宿駅など" />
        <label class="form-label">系列</label><input id="submitHotelChain" class="input" type="text" placeholder="なし / 系列名" />
        <label class="form-label">料金帯</label><input id="submitHotelPrice" class="input" type="text" placeholder="わかる範囲でOK" />
        <label class="form-label">タグ</label><input id="submitHotelTags" class="input" type="text" placeholder="サウナ,清潔感,駅近" />
        <label class="check-row"><input id="submitFeatureSauna" type="checkbox" />サウナ</label>
        <label class="check-row"><input id="submitFeatureOpenAirBath" type="checkbox" />露天風呂</label>
        <label class="check-row"><input id="submitFeatureClean" type="checkbox" />清潔感</label>
        <label class="check-row"><input id="submitFeaturePriceInfo" type="checkbox" />料金情報あり</label>
        <button class="primary-button" id="sendHotelSubmissionButton">申請する</button>
      </div>
    </section>
  `;

  document.getElementById("backToSearch").addEventListener("click", renderSearch);

  document.getElementById("sendHotelSubmissionButton").addEventListener("click", async () => {
    try {
      const tagsText = document.getElementById("submitHotelTags").value.trim();
      const tags = tagsText ? tagsText.split(",").map(tag => tag.trim()).filter(Boolean) : [];
      await submitHotel({
        submittedBy: state.user.uid,
        name: document.getElementById("submitHotelName").value.trim(),
        area: document.getElementById("submitHotelArea").value.trim(),
        subArea: document.getElementById("submitHotelSubArea").value.trim(),
        address: document.getElementById("submitHotelAddress").value.trim(),
        station: document.getElementById("submitHotelStation").value.trim(),
        chainName: document.getElementById("submitHotelChain").value.trim(),
        priceRange: document.getElementById("submitHotelPrice").value.trim(),
        tags,
        features: {
          sauna: document.getElementById("submitFeatureSauna").checked,
          openAirBath: document.getElementById("submitFeatureOpenAirBath").checked,
          clean: document.getElementById("submitFeatureClean").checked,
          priceInfo: document.getElementById("submitFeaturePriceInfo").checked
        }
      });
      alert("申請しました。管理者確認後に反映されます。");
      renderSearch();
    } catch (error) {
      alert(error.message);
    }
  });
}

function renderHotelAdmin() {
  const isAdmin = state.userData?.role === "admin";
  const isEditor = state.userData?.role === "editor";

  if (!isAdmin && !isEditor) {
    alert("権限がありません");
    renderMyPage();
    return;
  }

  screen.innerHTML = `
    <section>
      <button class="text-button" id="backToMyPage">← マイページへ戻る</button>
      <h1 class="section-title">ホテル管理</h1>
      <div class="card">
        <label class="form-label">ホテル名</label><input id="hotelName" class="input" type="text" placeholder="ホテル名" />
        <label class="form-label">エリア</label><input id="hotelArea" class="input" type="text" value="新宿" />
        <label class="form-label">細かいエリア</label><input id="hotelSubArea" class="input" type="text" placeholder="歌舞伎町など" />
        <label class="form-label">住所</label><input id="hotelAddress" class="input" type="text" placeholder="住所" />
        <label class="form-label">最寄り駅</label><input id="hotelStation" class="input" type="text" placeholder="新宿駅など" />
        <label class="form-label">系列</label><input id="hotelChain" class="input" type="text" placeholder="なし / 系列名" />
        <label class="form-label">料金帯</label><input id="hotelPrice" class="input" type="text" placeholder="8000-12000 など" />
        <label class="form-label">タグ</label><input id="hotelTags" class="input" type="text" placeholder="サウナ,清潔感,駅近" />
        <label class="check-row"><input id="featureSauna" type="checkbox" />サウナ</label>
        <label class="check-row"><input id="featureOpenAirBath" type="checkbox" />露天風呂</label>
        <label class="check-row"><input id="featureClean" type="checkbox" />清潔感</label>
        <label class="check-row"><input id="featurePriceInfo" type="checkbox" />料金情報あり</label>
        <button class="primary-button" id="addHotelButton">ホテルを追加</button>
      </div>
      <div class="card"><h2>登録済みホテル</h2><div id="adminHotelList"><p class="sub-text">読み込み中...</p></div></div>
    </section>
  `;

  document.getElementById("backToMyPage").addEventListener("click", renderMyPage);

  document.getElementById("addHotelButton").addEventListener("click", async () => {
    try {
      const tagsText = document.getElementById("hotelTags").value.trim();
      const tags = tagsText ? tagsText.split(",").map(tag => tag.trim()).filter(Boolean) : [];
      await addHotel({
        name: document.getElementById("hotelName").value.trim(),
        area: document.getElementById("hotelArea").value.trim(),
        subArea: document.getElementById("hotelSubArea").value.trim(),
        address: document.getElementById("hotelAddress").value.trim(),
        station: document.getElementById("hotelStation").value.trim(),
        chainName: document.getElementById("hotelChain").value.trim(),
        priceRange: document.getElementById("hotelPrice").value.trim(),
        tags,
        features: {
          sauna: document.getElementById("featureSauna").checked,
          openAirBath: document.getElementById("featureOpenAirBath").checked,
          clean: document.getElementById("featureClean").checked,
          priceInfo: document.getElementById("featurePriceInfo").checked
        },
        createdBy: state.user.uid
      });
      state.hotels = [];
      alert("ホテルを追加しました");
      renderHotelAdmin();
    } catch (error) {
      alert(error.message);
    }
  });

  loadAdminHotelList();
}

async function loadAdminHotelList() {
  const list = document.getElementById("adminHotelList");
  if (!list) return;

  try {
    const hotels = await fetchHotels();
    if (!hotels.length) {
      list.innerHTML = `<p class="sub-text">ホテルがありません</p>`;
      return;
    }

    list.innerHTML = hotels.map((hotel) => `
      <div class="admin-list-row" data-hotel-id="${hotel.id}">
        <div><strong>${escapeHtml(hotel.name)}</strong><p class="sub-text">${escapeHtml(hotel.area || "")} / ${escapeHtml(hotel.subArea || "")}</p></div>
        <button class="small-button">編集</button>
      </div>
    `).join("");

    list.querySelectorAll(".admin-list-row").forEach((row) => {
      row.addEventListener("click", () => renderHotelEdit(row.dataset.hotelId));
    });
  } catch (error) {
    list.innerHTML = `<p class="sub-text">ホテル一覧の取得に失敗しました</p>`;
    console.error(error);
  }
}

async function renderHotelEdit(hotelId) {
  const isAdmin = state.userData?.role === "admin";
  const isEditor = state.userData?.role === "editor";

  if (!isAdmin && !isEditor) {
    alert("権限がありません");
    renderMyPage();
    return;
  }

  let hotel;
  try { hotel = await fetchHotelById(hotelId); } catch (error) { alert(error.message); renderHotelAdmin(); return; }

  screen.innerHTML = `
    <section>
      <button class="text-button" id="backToHotelAdmin">← ホテル管理へ戻る</button>
      <h1 class="section-title">ホテル編集</h1>
      <div class="card">
        <label class="form-label">ホテル名</label><input id="editHotelName" class="input" type="text" value="${escapeHtml(hotel.name || "")}" />
        <label class="form-label">エリア</label><input id="editHotelArea" class="input" type="text" value="${escapeHtml(hotel.area || "新宿")}" />
        <label class="form-label">細かいエリア</label><input id="editHotelSubArea" class="input" type="text" value="${escapeHtml(hotel.subArea || "")}" />
        <label class="form-label">住所</label><input id="editHotelAddress" class="input" type="text" value="${escapeHtml(hotel.address || "")}" />
        <label class="form-label">最寄り駅</label><input id="editHotelStation" class="input" type="text" value="${escapeHtml(hotel.station || "")}" />
        <label class="form-label">系列</label><input id="editHotelChain" class="input" type="text" value="${escapeHtml(hotel.chainName || "なし")}" />
        <label class="form-label">料金帯</label><input id="editHotelPrice" class="input" type="text" value="${escapeHtml(hotel.priceRange || "")}" />
        <label class="form-label">タグ</label><input id="editHotelTags" class="input" type="text" value="${escapeHtml((hotel.tags || []).join(","))}" />
        <label class="form-label">状態</label>
        <select id="editHotelStatus" class="input">
          <option value="active" ${hotel.status === "active" ? "selected" : ""}>表示中</option>
          <option value="closed" ${hotel.status === "closed" ? "selected" : ""}>閉店</option>
          <option value="hidden" ${hotel.status === "hidden" ? "selected" : ""}>非表示</option>
        </select>
        <label class="check-row"><input id="editFeatureSauna" type="checkbox" ${hotel.features?.sauna ? "checked" : ""} />サウナ</label>
        <label class="check-row"><input id="editFeatureOpenAirBath" type="checkbox" ${hotel.features?.openAirBath ? "checked" : ""} />露天風呂</label>
        <label class="check-row"><input id="editFeatureClean" type="checkbox" ${hotel.features?.clean ? "checked" : ""} />清潔感</label>
        <label class="check-row"><input id="editFeaturePriceInfo" type="checkbox" ${hotel.features?.priceInfo ? "checked" : ""} />料金情報あり</label>
        <button class="primary-button" id="updateHotelButton">更新する</button>
      </div>
    </section>
  `;

  document.getElementById("backToHotelAdmin").addEventListener("click", renderHotelAdmin);

  document.getElementById("updateHotelButton").addEventListener("click", async () => {
    try {
      const tagsText = document.getElementById("editHotelTags").value.trim();
      const tags = tagsText ? tagsText.split(",").map(tag => tag.trim()).filter(Boolean) : [];
      await updateHotel(hotelId, {
        name: document.getElementById("editHotelName").value.trim(),
        area: document.getElementById("editHotelArea").value.trim(),
        subArea: document.getElementById("editHotelSubArea").value.trim(),
        address: document.getElementById("editHotelAddress").value.trim(),
        station: document.getElementById("editHotelStation").value.trim(),
        chainName: document.getElementById("editHotelChain").value.trim(),
        priceRange: document.getElementById("editHotelPrice").value.trim(),
        tags,
        status: document.getElementById("editHotelStatus").value,
        features: {
          sauna: document.getElementById("editFeatureSauna").checked,
          openAirBath: document.getElementById("editFeatureOpenAirBath").checked,
          clean: document.getElementById("editFeatureClean").checked,
          priceInfo: document.getElementById("editFeaturePriceInfo").checked
        }
      });
      state.hotels = [];
      alert("ホテル情報を更新しました");
      renderHotelAdmin();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function renderSubmissionAdmin() {
  if (state.userData?.role !== "admin") {
    alert("管理者のみ利用できます");
    renderMyPage();
    return;
  }

  screen.innerHTML = `
    <section>
      <button class="text-button" id="backToMyPage">← マイページへ戻る</button>
      <h1 class="section-title">申請確認</h1>
      <div id="submissionList"><div class="card"><p class="sub-text">読み込み中...</p></div></div>
    </section>
  `;

  document.getElementById("backToMyPage").addEventListener("click", renderMyPage);

  try {
    const submissions = await fetchPendingHotelSubmissions();
    if (submissions.length === 0) {
      document.getElementById("submissionList").innerHTML = `<div class="card"><p class="sub-text">未確認の申請はありません</p></div>`;
      return;
    }

    document.getElementById("submissionList").innerHTML = submissions.map((item) => `
      <div class="card">
        <div class="hotel-name">${escapeHtml(item.name)}</div>
        <p class="sub-text">${escapeHtml(item.area || "")} / ${escapeHtml(item.subArea || "")}</p>
        <p>住所：${escapeHtml(item.address || "未入力")}</p>
        <p>最寄り：${escapeHtml(item.station || "未入力")}</p>
        <p>系列：${escapeHtml(item.chainName || "なし")}</p>
        <p>料金帯：${escapeHtml(item.priceRange || "未入力")}</p>
        <div>${(item.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <button class="primary-button approve-submission" data-id="${item.id}">承認して追加</button>
        <button class="danger-button reject-submission" data-id="${item.id}">却下</button>
      </div>
    `).join("");

    document.querySelectorAll(".approve-submission").forEach((button) => {
      button.addEventListener("click", async () => {
        const submission = submissions.find(item => item.id === button.dataset.id);
        if (!submission) return;
        try {
          await approveHotelSubmission(submission, state.user.uid);
          state.hotels = [];
          alert("承認してホテルに追加しました");
          renderSubmissionAdmin();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    document.querySelectorAll(".reject-submission").forEach((button) => {
      button.addEventListener("click", async () => {
        const note = prompt("却下理由を書く場合は入力してください", "");
        try {
          await rejectHotelSubmission(button.dataset.id, note || "");
          alert("却下しました");
          renderSubmissionAdmin();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    document.getElementById("submissionList").innerHTML = `<div class="card"><p class="sub-text">申請の取得に失敗しました</p></div>`;
    console.error(error);
  }
}
