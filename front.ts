/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />

import Alpine from "https://taisukef.github.io/alpine_es/es/index.js";
import { fetchJSON } from "https://code4sabae.github.io/js/fetchJSON.js";
import { ImageUploader } from "https://code4sabae.github.io/js/ImageUploader.js";

interface Post {
  id: number;
  url: string;
  good: number;
}

enum TLSort { New, Trend }

class Utils {
  static tlSort2Type(sort: TLSort): string {
    if (sort == TLSort.New) {
      return "timeline";
    }
    return "trend";
  }
}

class Client {
  timeline: Post[] = [];

  async reload(sort: TLSort): Promise<void> {
    const type = Utils.tlSort2Type(sort);
    this.timeline = await fetchJSON("/api/" + type, {});
  }
  async good(id: number): Promise<void> {
    await fetchJSON("/api/good", {id: id});
  }
  upload(file: string, callback: any): void {
    const uploader = new ImageUploader("/data/");
    // 最大幅1200px、最大ファイルサイズ1メガバイト
    uploader.setFile(file, 1200, 1024 * 1024);
    (uploader as any).onload = async (url: string) => {
        await fetchJSON("/api/post", {url: url});
        callback();
    }
  }
}

const client = new Client();

(window as any).main = () => ({
  timeline: [] as Post[],
  sort: TLSort.New,
  type: "timeline",
  async init(): Promise<void> {
    await this.reload();
  },
  async reload(): Promise<void> {
    await client.reload(this.sort);
    this.timeline = client.timeline;
  },
  upload(e: any): void {
    for (let i = 0; i < e.files.length; i++) {
      client.upload(e.files[i], () => this.reload());
    }
  },
  async changeType(): Promise<void> {
    if (this.sort == TLSort.New) {
      this.sort = TLSort.Trend;
    } else {
      this.sort = TLSort.New;
    }
    this.type = Utils.tlSort2Type(this.sort);
    await this.reload();
  },
  async good(id: number): Promise<void> {
    await client.good(id);
    await this.reload();
  }
});

window.onload = () => Alpine.start();