import Alpine from "https://taisukef.github.io/alpine_es/es/index.js";
import { fetchJSON } from "https://code4sabae.github.io/js/fetchJSON.js";
import { ImageUploader } from "https://code4sabae.github.io/js/ImageUploader.js";

window.main = () => ({
  timeline: [],
  type: "timeline",
  async init() {
    await this.reload();
  },
  async upload(e) {
    for (let i = 0; i < e.files.length; i++) {
      let file = e.files[i];
      let uploader = new ImageUploader("/data/");
      // 最大幅1200px、最大ファイルサイズ1メガバイト
      uploader.setFile(file, 1200, 1024 * 1024);
      uploader.onload = async (url) => {
          await fetchJSON("/api/post", {"url": url});
          this.reload();
      };
    }
  },
  async changeType() {
    if (this.type == "timeline") {
      this.type = "trend";
    } else {
      this.type = "timeline";
    }
    this.reload();
  },
  async reload() {
    this.timeline = await fetchJSON("/api/" + this.type, {});
  },
  async good(id) {
    await fetchJSON("/api/good", {"id": id});
    await this.reload();
  },
  
});

window.onload = () => Alpine.start();