import Alpine from "https://taisukef.github.io/alpine_es/es/index.js";
import { fetchJSON } from "https://code4sabae.github.io/js/fetchJSON.js";
import { ImageUploader } from "https://code4sabae.github.io/js/ImageUploader.js";

window.main = () => ({
  timeline: [],
  sort: "new",
  async init() {
    await this.reload();
  },
  async reload() {
    this.timeline = await fetchJSON("/api/timeline", {sort: this.sort});
  },
  upload(e) {
    for (let i = 0; i < e.files.length; i++) {
      const uploader = new ImageUploader("/data/");
      // 最大幅1200px、最大ファイルサイズ1メガバイト
      uploader.setFile(e.files[i], 1200, 1024 * 1024);
      uploader.onload = async (url) => {
        await fetchJSON("/api/post", {url: url});
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
    await fetchJSON("/api/good", {id: id});
    await this.reload();
  }
});

window.onload = () => Alpine.start();