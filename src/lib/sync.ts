import type { Helia } from "helia";
import { loadConfig } from "./config";
import { loadRoot, loadAllowedPeers } from "./identity";

export interface SyncStatus {
  topic: string;
  peerId: string;
  connectedPeers: string[];
  lastAnnounced?: { cid: string; at: number };
  lastRemote?: { cid: string; from: string; at: number };
  publishedCount: number;
  receivedCount: number;
}

export interface SyncHandle {
  announceNow(): Promise<void>;
  getStatus(): SyncStatus;
  subscribe(fn: (s: SyncStatus) => void): () => void;
}

export async function startSync(
  helia: Helia,
  onRemoteRoot: (cid: string) => void,
): Promise<SyncHandle> {
  const cfg = await loadConfig();
  const topic = `${cfg.pubsubNamespace}`;
  const ps = helia.libp2p.services.pubsub as any;

  await ps.subscribe(topic);
  console.log(`Subscribed to sync topic: ${topic}`);

  // --- Status state + observers
  const observers = new Set<(s: SyncStatus) => void>();
  const status: SyncStatus = {
    topic,
    peerId: helia.libp2p.peerId.toString(),
    connectedPeers: [],
    publishedCount: 0,
    receivedCount: 0,
  };
  function snapshot(): SyncStatus {
    return { ...status, connectedPeers: [...status.connectedPeers] };
  }
  function emit() {
    const s = snapshot();
    observers.forEach(fn => fn(s));
  }
  function refreshConnections() {
    status.connectedPeers = helia.libp2p
      .getConnections()
      .map((c: any) => c.remotePeer?.toString?.())
      .filter(Boolean);
    emit();
  }

  // Track newest root per peer to avoid regressions
  const latestByPeer = new Map<string, { cid: string; ts: number }>();

  ps.addEventListener("message", (evt: any) => {
    try {
      const txt = new TextDecoder().decode(evt.detail.data);
      const msg = JSON.parse(txt) as { 
        type: "root" | "request"; 
        cid?: string; 
        peerId?: string;
        timestamp?: number;
      };

      const from: string | undefined = evt?.detail?.from?.toString?.();
      if (!from) return;

      // Only accept from allowed peers
      loadAllowedPeers().then((allowed) => {
        if (!allowed.has(from)) return;

        if (msg.type === "root" && msg.cid) {
          const ts = msg.timestamp ?? 0;
          const prev = latestByPeer.get(from);
          if (!prev || ts > prev.ts) {
            latestByPeer.set(from, { cid: msg.cid, ts });
            status.receivedCount += 1;
            status.lastRemote = { cid: msg.cid, from, at: Date.now() };
            emit();
            onRemoteRoot(msg.cid);
          }
        } else if (msg.type === "request") {
          setTimeout(announce, 100);
        }
      }).catch(() => {/* ignore */});
    } catch (e) {
      console.warn("Failed to parse sync message:", e);
    }
  });

  // Listen for new peer connections to request sync
  helia.libp2p.addEventListener("peer:connect", async () => {
    console.log("New peer connected, requesting sync");
    refreshConnections();
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ type: "request", timestamp: Date.now() })
      );
      await ps.publish(topic, payload);
    } catch (e) {
      console.warn("Failed to request sync:", e);
    }
  });
  helia.libp2p.addEventListener("peer:disconnect", () => {
    refreshConnections();
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
      status.publishedCount += 1;
      status.lastAnnounced = { cid: root.manifestCid, at: Date.now() };
      emit();
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

  // Initial connections snapshot
  refreshConnections();

  return {
    announceNow: announce,
    getStatus: () => snapshot(),
    subscribe(fn) {
      observers.add(fn);
      // immediate call
      fn(snapshot());
      return () => observers.delete(fn);
    }
  };
}
