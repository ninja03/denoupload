// https://fukuno.jig.jp/2943
import { Server } from "https://code4sabae.github.io/js/Server.js"
import { DB } from "https://deno.land/x/sqlite/mod.ts"

class MyServer extends Server {

  db = new DB("data.db");

  // reqにはPOSTで送るJSONが入っています
  api(path, req) {
    switch (path) {
      case "/api/timeline": return this.timeline(req);
      case "/api/post":     return this.post(req);
      case "/api/good":     return this.good(req);
    }
  }

  timeline(req) {
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
    let resp = [];
    const list = this.db.query(`select id, url, good from photo order by ${sortKey} desc`);
    for (const [id, url, good] of list) {
      resp.push({id, url, good});
    }
    return resp;
  }

  post(req) {
    this.db.query("insert into photo (url) values((?))", [req.url]);
    return {};
  }
  
  good(req) {
    this.db.query("update photo set good = good + 1 where id = (?)", [req.id]);
    return {};
  }

}

new MyServer(80);
