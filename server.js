// https://fukuno.jig.jp/2943
import { Server } from "https://code4sabae.github.io/js/Server.js";
import { DB } from "https://deno.land/x/sqlite/mod.ts";

const getTimeline = (req) => {
  // タイムラインをそのまま返す
  // いいねの多い順に並び替えて返す
  let sortKey;
  if (req.sort === "new") {
    sortKey = "id";
  } else if (req.sort === "trend") {
    sortKey = "good";
  } else {
    return null;
  }
  const db = new DB("db.sqlite");
  const resp = [];
  const list = db.query("select id, url, good from photo order by (?) desc", [sortKey]);
  for (const [id, url, good] of list) {
    resp.push({id, url, good});
  }
  db.close();
  return resp;
};

const post = (req) => {
  // タイムラインに投稿する
  // 画像ファイル自体は「/data/」のAPIで送られていて
  // 画像のURLがreq.urlで送られてくるのでそれを保存する
  const db = new DB("db.sqlite");
  db.query("insert into photo (url) values((?))", [req.url]);
  db.close();
  return {};
};

const good = (req) => {
  // 写真にいいねをする
  // いいねを1増やす
  const db = new DB("db.sqlite");
  db.query("update photo set good = good + 1 where id = (?)", [req.id]);
  db.close();
  return {};
};

class MyServer extends Server {
  // reqにはPOSTで送るJSONが入っています
  api(path, req) {
    switch (path) {
      case "/api/timeline": return getTimeline(req);  
      case "/api/post":     return post(req);
      case "/api/good":     return good(req);
    }
  }
}

new MyServer(80);
