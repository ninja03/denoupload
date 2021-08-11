// Serverは[Server.js](https://fukuno.jig.jp/2943)を使います
// HTMLファイルや画像はstaticフォルダに置きます
import { Server } from "https://ninja03.github.io/denokun/lib/Server.js";

// DBはデータはSQLiteに保存してdeno-sqliteで読み書きします
import { DB } from "https://deno.land/x/sqlite@v3.0.0/mod.ts";

// bcryptはパスワードハッシュ化用です
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";

console.log("denoupload");

class MyServer extends Server {
  // SQLiteのデータベースを開きます
  db = new DB("data.db");

  // パス(/api/xxx)とreq(JSONオブジェクト)が渡されます
  // GETもPOSTも来ます(reqはPOSTのみ)
  // レスポンスをJSONオブジェクトで返します
  // 何も返さないと「not found」という文字が返ります
  async api(path, req) {
    console.log(path, req);

    // セッション不要API
    switch (path) {
      case "/api/regist":          return this.regist(req);
      case "/api/login":           return this.login(req);
      case "/api/public_timeline": return this.publicTimeline(req);
    }

    // セッション必要API
    if (req["session"] === undefined) {
      return;
    }

    // リクエストのセッションをDBのセッションと
    // 比較してユーザを特定します
    const r = this.db.query(
      "select id from user where session = (?)",
      [req.session]
    )[0];
    if (r === undefined) {
      return;
    }
    const [userId] = r;

    switch (path) {
      case "/api/user":     return this.getUser(req, userId);
      case "/api/logout":   return this.logout(req, userId);
      case "/api/timeline": return this.timeline(req, userId);
      case "/api/post":     return this.post(req, userId);
      case "/api/good":     return this.good(req, userId);
    }
  }

  // ログイン中のユーザ情報を返します
  getUser(req, userId) {
    const r = this.db.query(
      "select name from user where id = (?) limit 1",
      [userId]
    )[0];
    const [name] = r;
    return {
      name: name
    };
  }

  // 新しいユーザを登録してセッションを返します
  async regist(req) {
    const r = this.db.query(
      "select count(*) from user where name = (?)",
      [req.name]
    )[0];
    if (r[0] == 1) {
      return { err: "登録されています" };
    }
    const pass = await bcrypt.hash(req.pass);
    const session = crypto.randomUUID();
    this.db.query(
      `insert into user (name, pass, session) values ((?), (?), (?))`,
      [req.name, pass, session]
    );
    return {
      session: session
    };    
  }

  // ログインします
  // リクエストのパスワードをハッシュ化して
  // DB内のハッシュ値と比較します
  // 合っていればセッションをランダムに作ってDBに保存して
  // レスポンスで返します
  async login(req) {
    const r = this.db.query(
      `select id, pass
        from user
        where name = (?) limit 1`,
      [req.name]
    )[0];
    if (r === undefined) {
      return { err: "登録されていません" };
    }
    const [id, pass] = r;
    // ハッシュは2番目の引数に
    const passok = await bcrypt.compare(req.pass, pass);
    if (!passok) {
      return { err: "パスワードが違います" };
    }
    const session = crypto.randomUUID();
    this.db.query(
      "update user set session = (?) where id = (?)",
      [session, id]
    );
    return {
      session: session
    };
  }

  // ログアウトします
  // DBのセッションを削除します
  logout(req, userId) {
    this.db.query(
      "update user set session = null where id = (?)",
      [userId]
    );
    return {};
  }

  // タイムラインをそのまま返す
  // いいねの多い順に並び替えて返す
  publicTimeline(req) {
    let sortKey;
    if (req.sort === "new") {
      sortKey = "id";
    } else if (req.sort === "trend") {
      sortKey = "good";
    } else {
      return null;
    }
    let resp = [];
    let list;
    list = this.db.query(
      `select photo.id, url, good
        from photo
        order by ${sortKey} desc, id desc`
    );
    for (const [id, url, good, mygood] of list) {
      resp.push({
        id: id,
        url: url, 
        good: good,
        mygood: false
      });
    }
    return resp;
  }

  // タイムライン(写真一覧)を返します
  timeline(req, userId) {
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
    let list;
    // ログインしていればそれぞれの写真に
    // いいねしたかも返します
    list = this.db.query(
      `select photo.id, url, good, good.photo_id
        from photo
        left join good on good.photo_id = photo.id and good.user_id = (?)
        order by ${sortKey} desc, id desc`,
      [userId]
    );
    for (const [id, url, good, mygood] of list) {
      resp.push({
        id: id,
        url: url, 
        good: good,
        mygood: mygood != null
      });
    }
    return resp;
  }

  // 写真を投稿します
  // 画像ファイルはImageUploaderで事前に保存されているので
  // urlだけをDBに保存します
  post(req, userId) {
    this.db.query(
      "insert into photo (user_id, url) values((?), (?))",
      [userId, req.url]
    );
    return {};
  }

  // いいねします
  // 1ユーザー1回だけいいねできるようにgoodテーブルにも保存します
  // リクエストのdelがtrueのときはいいねを解除します
  good(req, userId) {
    const r = this.db.query(
      `select count(*)
        from good where user_id = (?) and photo_id = (?)`,
      [userId, req.photoId]
    )[0];
    if (req.del && r[0] !== 1) {
      return;
    }
    if (!req.del && r[0] === 1) {
      return;
    }
    // 2つのテーブルを変更するのでトランザクション処理をします
    this.db.query("begin transaction");
    if (req.del) {
      this.db.query(
        "delete from good where user_id = (?) and photo_id = (?)",
        [userId, req.photoId]
      );
      this.db.query(
        "update photo set good = good - 1 where id = (?)",
        [req.photoId]
      );
    } else {
      this.db.query(
        "insert into good (user_id, photo_id) values((?), (?))",
        [userId, req.photoId]
      );
      this.db.query(
        "update photo set good = good + 1 where id = (?)",
        [req.photoId]
      );
    }
    this.db.query("commit");
    return {};
  }

}

// DBの初期化をします
// テーブルがない場合に新しく作ります
const db = new DB("data.db");

// ユーザーテーブル
db.query(`
  create table if not exists user (
    id integer primary key autoincrement,
    name text not null unique,
    pass text not null,
    session text,
    time not null default (datetime ('now', 'localtime'))
  );
`);

// 写真テーブル(いいね回数も保存)
db.query(`
  create table if not exists photo (
    id      integer primary key autoincrement,
    user_id integer not null,
    url     text not null,
    good    integer not null default 0,
    time not null default (datetime ('now', 'localtime'))
  );
`);

// いいねテーブル(ユーザーと写真でユニーク)
db.query(`
  create table if not exists good (
    user_id integer not null,
    photo_id integer not null,
    time not null default (datetime ('now', 'localtime')),
    primary key(user_id, photo_id)
  );
`);
db.close();

// 80番ポートでサーバを起動
const s = new MyServer(8881);
