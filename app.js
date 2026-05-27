function showPage(page){

  const content = document.getElementById("content");

  if(page === "home"){
    content.innerHTML = "ホーム画面";
  }

  if(page === "search"){
    content.innerHTML = "検索画面";
  }

  if(page === "record"){
    content.innerHTML = "行脚記録画面";
  }

  if(page === "ranking"){
    content.innerHTML = "ランキング画面";
  }

  if(page === "mypage"){
    content.innerHTML = "マイページ";
  }

}
