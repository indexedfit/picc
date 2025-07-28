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
    // Public circuit relay v2 nodes
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
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
