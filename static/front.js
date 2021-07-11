import Alpine from "https://taisukef.github.io/alpine_es/es/index.js"
import { fetchJSON } from "https://code4sabae.github.io/js/fetchJSON.js"
import { ImageUploader } from "https://code4sabae.github.io/js/ImageUploader.js"

class Client {
  async reload(type) {
    this.timeline = await fetchJSON("/api/" + type, {});
  }
  async good(id) {
    await fetchJSON("/api/good", {id: id});
  }
  upload(file, callback) {
    const uploader = new ImageUploader("/data/")
    // 最大幅1200px、最大ファイルサイズ1メガバイト
    uploader.setFile(file, 1200, 1024 * 1024)
    uploader.onload = async (url) => {
        await fetchJSON("/api/post", {url: url});
        callback();
    }
  }
}

const client = new Client()

window.main = () => ({
  timeline: [],
  type: "timeline",
  async init() {
    await this.reload();
  },
  async reload() {
    await client.reload(this.type)
    this.timeline = client.timeline;
  },
  upload(e) {
    for (let i = 0; i < e.files.length; i++) {
      client.upload(e.files[i], () => this.reload());
    }
  },
  async changeType() {
    this.type = this.type == "timeline" ? "trend" : "timeline";
    await this.reload();
  },
  async good(id) {
    await client.good(id);
    await this.reload();
  }
});

window.onload = () => Alpine.start();