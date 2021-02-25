// https://fukuno.jig.jp/2943
import { Server } from "https://code4sabae.github.io/js/Server.js";

class MyServer extends Server {
    // 最初にDBをファイルから変数にロードして
    // 処理がおわったら変数からファイルに書き出す
    // pathにはアクセスしたURLの「/api/○○」が入っていて
    // reqにはPOSTで送るJSONが入っています
    // resp変数にフロントエンドに返したい内容をセットします
    api(path, req) {
        let db; // データベースの内容（db.json)
        try {
            // DBファイルの読み込み
            // ※誰かがこのapi関数にアクセスしているときは、ほかのユーザはその処理が終わるのを待つのでdb.jsonで不整合は生じない
            db = JSON.parse(Deno.readTextFileSync("db.json"))
        } catch (e) {
            // DBファイルがなければ空データの作成
            db = {
                timeline: []
            };
        }
        let resp = {};  // フロントエンドに返すJSON
        if (path === "/api/timeline") {
            // タイムラインをそのまま返す
            resp = db.timeline;
        } else if (path === "/api/post") {
            // タイムラインに投稿する
            // 画像ファイル自体は「/data/」のAPIで送られていて
            // 画像のURLがreq.urlで送られてくるのでそれを保存する
            let nextid;
            if (db.timeline.length === 0) {
                // 初投稿はIDを1にする
                nextid = 1;
            } else {
                // 2つめ投稿以降は最新のID足す1
                nextid = db.timeline[0].id + 1;
            }
            let newpost = {
                id: nextid,
                url: req.url,
                good: 0
            };
            // timeline配列の先頭に追加する
            db.timeline.unshift(newpost);
        } else if (path === "/api/good") {
            // 写真にいいねをする
            // タイムラインからIDで探して、いいねを1増やす
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
