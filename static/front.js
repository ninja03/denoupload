import Alpine from "https://unpkg.com/alpinejs@3.2.2/dist/module.esm.js";
import { fetchJSON } from "https://code4sabae.github.io/js/fetchJSON.js";
import { ImageUploader } from "https://code4sabae.github.io/js/ImageUploader.js";

Alpine.data("app", () => ({
  timeline: [],
  sort: "new",
  async init() {
    await this.reload();
  },
  async reload() {
    this.timeline = await fetchJSON("/api/timeline", {sort: this.sort});
  },
  upload(files) {
    for (const f of files) {
      const up = new ImageUploader("/data/");
      // 最大幅1200px、最大ファイルサイズ1メガバイト
      up.setFile(f, 1200, 1024 * 1024);
      up.onload = async url => {
        await fetchJSON("/api/post", {url});
        await this.reload();
      }
    }
  },
  async changeType() {
    if (this.sort === "new") {
      this.sort = "trend";
    } else {
      this.sort = "new";
    }
    await this.reload();
  },
  async good(id) {
    await fetchJSON("/api/good", {id});
    await this.reload();
  }
}));

Alpine.start();
