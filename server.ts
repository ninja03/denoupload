// https://fukuno.jig.jp/2943
import { Server } from "https://code4sabae.github.io/js/Server1.js";
import { jsonfs } from "https://code4sabae.github.io/js/jsonfs.js";

class DB {
  timeline: Array<Post> = [];
}

class Post {
  id: number;
  url: string;
  good = 0;

  constructor(id: number, url: string) {
    this.id = id;
    this.url = url;
  }
}

class MyServer extends Server {
  // 最初にDBをファイルから変数にロードして
  // 処理がおわったら変数からファイルに書き出す
  // pathにはアクセスしたURLの「/api/○○」が入っていて
  // reqにはPOSTで送るJSONが入っています
  // resp変数にフロントエンドに返したい内容をセットします
  api(path: string, req: any) {
    let db: DB; // データベースの内容（db.json)
    try {
      // DBファイルの読み込み
      // ※誰かがこのapi関数にアクセスしているときは、ほかのユーザはその処理が終わるのを待つのでdb.jsonで不整合は生じない
      db = jsonfs.read("db.json");
    } catch (e) {
      // DBファイルがなければ空データの作成
      db = new DB();
    }
    let resp = {};  // フロントエンドに返すJSON
    if (path == "/api/timeline") {
      // タイムラインをそのまま返す
      resp = db.timeline;
    } else if (path == "/api/post") {
      // タイムラインに投稿する
      // 画像ファイル自体は「/data/」のAPIで送られていて
      // 画像のURLがreq.urlで送られてくるのでそれを保存する
      let nextid;
      if (db.timeline.length == 0) {
        // 初投稿はIDを1にする
        nextid = 1;
      } else {
        // 2つめ投稿以降は最新のID足す1
        nextid = db.timeline[0].id + 1;
      }
      const newpost = new Post(nextid, req.url)
      // timeline配列の先頭に追加する
      db.timeline.unshift(newpost);
    } else if (path == "/api/good") {
      // 写真にいいねをする
      // タイムラインからIDで探して、いいねを1増やす
      for (let i = 0; i < db.timeline.length; i++) {
        if (db.timeline[i].id === req.id) {
          db.timeline[i].good++;
          break;
        }
      }
    } else if (path == "/api/trend") {
      // いいねの多い順に並び替えて返す
      // db.timeline.sortにするとDBの内容まで変わってしまうので注意！
      // trend変数にコピー(slice)してからソートする
      const trend = db.timeline.slice();
      trend.sort((a, b) => b.good - a.good);
      resp = trend;
    }
    // DBの保存
    jsonfs.write("db.json", db);
    return resp;
  }
}

new MyServer(80);
