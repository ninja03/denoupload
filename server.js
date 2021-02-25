import { Server } from "https://code4sabae.github.io/js/Server.js";

class MyServer extends Server {
    api(path, req) {
        let db; // データベースの内容
        try {
            // DBファイルの読み込み
            db = JSON.parse(Deno.readTextFileSync("db.json"))
        } catch (e) {
            // DBファイルがなければ空データの作成
            db = {
                timeline: []
            };
        }
        let resp = {};  // フロントエンドに返すJSON
        if (path === "/api/timeline") {
            // タイムラインを返す
            resp = db.timeline;
        } else if (path === "/api/post") {
            // タイムラインに投稿する
            let nextid;
            if (db.timeline.length === 0) {
                nextid = 1;
            } else {
                nextid = db.timeline[0].id + 1;
            }
            let newpost = {
                id: nextid,
                url: req.url,
                good: 0
            };
            db.timeline.unshift(newpost);
        } else if (path === "/api/good") {
            // 写真にいいねをする
            // タイムラインからIDで探していいねを1増やす
            for (let i = 0; i < db.timeline.length; i++) {
                if (db.timeline[i].id === req.id) {
                    db.timeline[i].good++;
                    break;
                }
            }
        } else if (path === "/api/trend") {
            // いいねの多い順に並び替えて返す
            // db.timeline.sortにするとDBの内容まで変わってしまうので注意！
            // trend変数にコピー(slice)してからソートする
            let trend = db.timeline.slice();
            trend.sort((a, b) => b.good - a.good);
            resp = trend;
        }
        // DBの保存
        Deno.writeTextFileSync("db.json", JSON.stringify(db, null, "\t"));
        return resp;
    }
}
new MyServer(80);
