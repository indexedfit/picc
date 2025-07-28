import type { Helia } from "helia";
import { loadConfig } from "./config";
import { loadRoot } from "./identity";

export async function startSync(
  helia: Helia,
  onRemoteRoot: (cid: string) => void,
): Promise<void> {
  const cfg = await loadConfig();
  const topic = `${cfg.pubsubNamespace}`;
  const ps = helia.libp2p.services.pubsub as any;

  await ps.subscribe(topic);
  console.log(`Subscribed to sync topic: ${topic}`);

  // Track seen CIDs to avoid processing duplicates
  const seenCids = new Set<string>();

  ps.addEventListener("message", (evt: any) => {
    try {
      const txt = new TextDecoder().decode(evt.detail.data);
      const msg = JSON.parse(txt) as { 
        type: "root" | "request"; 
        cid?: string; 
        peerId?: string;
        timestamp?: number;
      };
      
      if (msg.type === "root" && msg.cid && !seenCids.has(msg.cid)) {
        console.log(`Received remote root: ${msg.cid}`);
        seenCids.add(msg.cid);
        onRemoteRoot(msg.cid);
      } else if (msg.type === "request") {
        // Respond to sync requests immediately
        setTimeout(announce, 100);
      }
    } catch (e) {
      console.warn("Failed to parse sync message:", e);
    }
  });

  // Listen for new peer connections to request sync
  helia.libp2p.addEventListener("peer:connect", async () => {
    console.log("New peer connected, requesting sync");
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ type: "request", timestamp: Date.now() })
      );
      await ps.publish(topic, payload);
    } catch (e) {
      console.warn("Failed to request sync:", e);
    }
  });

  async function announce() {
    const root = await loadRoot();
    if (!root.manifestCid) return;

    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ 
          type: "root", 
          cid: root.manifestCid,
          timestamp: Date.now()
        }),
      );
      await ps.publish(topic, payload);
      console.log(`Published root: ${root.manifestCid}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (!/NoPeersSubscribedToTopic/i.test(msg)) {
        console.warn("pubsub publish failed", e);
      }
    }
  }

  // More aggressive syncing schedule
  await announce();
  setTimeout(announce, 500);   // Quick initial sync
  setTimeout(announce, 2000);  // Second attempt
  setInterval(announce, 10000); // Regular sync every 10s
  
  // Also announce when visibility changes (tab focus)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(announce, 100);
      }
    });
  }
}
