function showPage(page){

const content = document.getElementById("content");

if(page === "home"){
content.innerHTML = "<div class='card'>ホーム画面</div>";
}

if(page === "search"){
content.innerHTML = `
<div class='card'>
<h2>ホテル検索</h2>
<input placeholder='ホテル名検索'>
</div>

<div class='card'>
<h3>ホテルA</h3>
<p>新宿</p>
</div>

<div class='card'>
<h3>ホテルB</h3>
<p>歌舞伎町</p>
</div>
`;
}

if(page === "record"){
content.innerHTML = "<div class='card'>行脚記録画面</div>";
}

if(page === "mypage"){
content.innerHTML = "<div class='card'>マイページ</div>";
}

}

showPage('home');
