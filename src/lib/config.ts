// Config persisted in OPFS so refreshes & different tabs stay consistent.
import { readJson, writeJson } from "./opfs";

const PATH = ["config"];
const FILENAME = "config.json";

export interface AppConfig {
  blockstoreName: string; // folder used by blockstore-opfs
  relayAddrs: string[]; // webrtc-star relays or custom
  pubsubNamespace: string; // topic namespace for sync
}

const DEFAULT_CONFIG: AppConfig = {
  blockstoreName: "bs",
  relayAddrs: [
    "/dns4/relay.localhost/tcp/443/wss/p2p/12D3KooWJ5izG8rXB95W6xFp1tFtAAoQ1Df3vVyQ7XmA3Bg1gHCN",
    // "these will be used for circuit relay reservation"
    // lol
  ],
  pubsubNamespace: "gallery-sync",
};

export async function loadConfig(): Promise<AppConfig> {
  const cfg = await readJson<AppConfig>(PATH, FILENAME);
  if (!cfg) {
    await writeJson(PATH, FILENAME, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  // Basic migration/merge
  return { ...DEFAULT_CONFIG, ...cfg };
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  await writeJson(PATH, FILENAME, cfg);
}
