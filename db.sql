create table photo (
  id     integer primary key autoincrement,
  url    text,
  good   integer default 0,
  ts     default CURRENT_TIMESTAMP
);
