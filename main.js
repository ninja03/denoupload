// Serverは[Server.js](https://fukuno.jig.jp/2943)を使います
// HTMLファイルや画像はstaticフォルダに置きます
import { Server } from "https://ninja03.github.io/denokun/lib/Server.js"

// DBはデータはSQLiteに保存してdeno-sqliteで読み書きします
import { DB } from "https://deno.land/x/sqlite@v3.0.0/mod.ts"

// bcryptはパスワードハッシュ化用です
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts"

export class MyServer extends Server {

  constructor(dbname) {
    super()

    // SQLiteのデータベースを開きます
    this.db = new DB(dbname)

    // DBの初期化をします
    // テーブルがない場合に新しく作ります

    // ユーザーテーブル
    this.db.query(`
      create table if not exists user (
        id integer primary key autoincrement,
        name text not null unique,
        pass text not null,
        session text,
        time not null default (datetime ('now', 'localtime'))
      )
    `)

    // 写真テーブル(いいね回数も保存)
    this.db.query(`
      create table if not exists photo (
        id      integer primary key autoincrement,
        user_id integer not null,
        url     text not null,
        good    integer not null default 0,
        time not null default (datetime ('now', 'localtime'))
      )
    `)

    // いいねテーブル(ユーザーと写真でユニーク)
    this.db.query(`
      create table if not exists good (
        user_id integer not null,
        photo_id integer not null,
        time not null default (datetime ('now', 'localtime')),
        primary key(user_id, photo_id)
      )
    `)
  }

  // パス(/api/xxx)とreq(JSONオブジェクト)が渡されます
  // GETもPOSTも来ます(reqはPOSTのみ)
  // レスポンスをJSONオブジェクトで返します
  // 何も返さないと「not found」という文字が返ります
  api(path, req) {
    console.log(path, req)
    // セッション不要API
    switch (path) {
      case "/api/regist":          return this.regist(req)
      case "/api/login":           return this.login(req)
      case "/api/public_timeline": return this.publicTimeline(req)
    }
    // セッション必要API
    if (!("session" in req)) {
      return
    }
    // リクエストのセッションをDBのセッションと
    // 比較してユーザを特定します
    const user = this.db.queryEntries("select * from user where session = :session", {
      session: req.session
    })[0]
    if (!user) {
      return
    }

    switch (path) {
      case "/api/user":     return this.getUser(user)
      case "/api/logout":   return this.logout(user)
      case "/api/timeline": return this.timeline(user, req)
      case "/api/post":     return this.post(user, req)
      case "/api/good":     return this.good(user, req)
    }
  }

  // ログイン中のユーザ情報を返します
  getUser(user) {
    return { name: user.name }
  }

  // 新しいユーザを登録してセッションを返します
  regist(req) {
    const user = this.db.queryEntries("select * from user where name = :name", {
      name: req.name
    })[0]
    if (user) {
      return { err: "登録されています" }
    }
    const hashPass = bcrypt.hashSync(req.pass)
    const session = crypto.randomUUID()
    this.db.query("insert into user (name, pass, session) values (:name, :pass, :session)", {
      name: req.name,
      pass: hashPass,
      session: session
    })
    return { session }
  }

  // ログインします
  // リクエストのパスワードをハッシュ化して
  // DB内のハッシュ値と比較します
  // 合っていればセッションをランダムに作ってDBに保存して
  // レスポンスで返します
  login(req) {
    const user = this.db.queryEntries("select * from user where name = :name limit 1", {
      name: req.name
    })[0]
    if (!user) {
      return { err: "登録されていません" }
    }
    // ハッシュは2番目の引数に
    if (!bcrypt.compareSync(req.pass, user.pass)) {
      return { err: "パスワードが違います" }
    }
    const session = crypto.randomUUID()
    this.db.query("update user set session = :session where id = :userId", {
      session: session,
      userId: user.id
    })
    return { session }
  }

  // ログアウトします
  // DBのセッションを削除します
  logout(user) {
    this.db.query("update user set session = null where id = :userId", {
      userId: user.id
    })
    return {}
  }

  // タイムラインをそのまま返す
  // いいねの多い順に並び替えて返す
  publicTimeline(req) {
    let sortKey
    if (req.sort === "new") {
      sortKey = "id"
    } else if (req.sort === "trend") {
      sortKey = "good"
    } else {
      return null
    }
    return this.db.queryEntries(
      "select * from photo order by " + sortKey + " desc, id desc"
    ).map(a => ({
      id: a.id,
      url: a.url,
      good: a.good,
      mygood: false
    }))
  }

  // タイムライン(写真一覧)を返します
  timeline(user, req) {
    // タイムラインをそのまま返す
    // いいねの多い順に並び替えて返す
    let sortKey
    if (req.sort == "new") {
      sortKey = "id"
    } else if (req.sort == "trend") {
      sortKey = "good"
    } else {
      return null
    }
    // ログインしていればそれぞれの写真に
    // いいねしたかも返します
    return this.db.queryEntries(
      "select * from photo " +
      "left join good on good.photo_id = photo.id and good.user_id = :userId " +
      "order by " + sortKey + " desc, id desc",
      { userId: user.id }
    ).map(a => ({
      id: a.id,
      url: a.url,
      good: a.good,
      mygood: a.photo_id != null
    }))
  }

  // 写真を投稿します
  // 画像ファイルはImageUploaderで事前に保存されているので
  // urlだけをDBに保存します
  post(user, req) {
    this.db.query("insert into photo (user_id, url) values(:userId, :url)", {
      userId: user.id,
      url: req.url
    })
    return {}
  }

  // いいねします
  // 1ユーザー1回だけいいねできるようにgoodテーブルにも保存します
  // リクエストのdelがtrueのときはいいねを解除します
  good(user, req) {
    const good = this.db.queryEntries("select * from good where user_id = :userId and photo_id = :photoId", {
      userId: user.id,
      photoId: req.photoId
    })[0]
    if (req.del && !good) {
      return
    } else if (!req.del && good) {
      return
    }
    // 2つのテーブルを変更するのでトランザクション処理をします
    this.db.query("begin transaction")
    if (req.del) {
      this.db.query("delete from good where user_id = :userId and photo_id = :photoId", {
        userId: user.id,
        photoId: req.photoId
      })
      this.db.query("update photo set good = good - 1 where id = :id", {
        id: req.photoId
      })
    } else {
      this.db.query("insert into good (user_id, photo_id) values(:userId, :photoId)", {
        userId: user.id,
        photoId: req.photoId
      })
      this.db.query("update photo set good = good + 1 where id = :id", {
        id: req.photoId
      })
    }
    this.db.query("commit")
    return {}
  }
}

// 80番ポートでサーバを起動
if (import.meta.main) {
  new MyServer("data.db").start(8881)
}
