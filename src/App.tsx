import { useEffect, useState } from "react";
import { initHelia } from "./lib/helia";
import type { Manifest } from "./lib/manifest";
import {
  loadManifest,
  saveManifestToOpfs,
  persistManifestToIpfs,
  loadRootManifestFromIpfs,
  mergeManifests,
} from "./lib/manifest";
import { saveRoot } from "./lib/identity";
import PairingDialog from "./components/PairingDialog";
import PeerManager from "./components/PeerManager";
import GalleryView from "./components/GalleryView";
import { startSync } from "./lib/sync";
import type { SyncHandle } from "./lib/sync";
import SyncPanel from "./components/SyncPanel";

export default function App() {
  const [helia, setHelia] = useState<any>(null);
  const [pairOpen, setPairOpen] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [syncHandle, setSyncHandle] = useState<SyncHandle | null>(null);

  useEffect(() => {
    (async () => {
      const { helia } = await initHelia();
      setHelia(helia);

      // Try to load latest manifest from OPFS, then refresh from IPFS root (if any)
      const local = await loadManifest();
      setManifest(local);

      const fresher = await loadRootManifestFromIpfs(helia);
      if (fresher) {
        const merged = mergeManifests(local, fresher);
        await saveManifestToOpfs(merged);
        const cid = await persistManifestToIpfs(helia, merged); // normalize
        await saveRoot(cid.toString());
        setManifest(merged);
      }

      // Start pubsub sync – on remote root, fetch & merge
      const handle = await startSync(helia, async (remoteCid) => {
        try {
          const dec = new TextDecoder();
          let text = "";
          for await (const chunk of (await import("@helia/unixfs"))
            .unixfs(helia)
            .cat(remoteCid as any)) {
            text += dec.decode(chunk, { stream: true });
          }
          const remote = JSON.parse(text) as Manifest;
          const current = await loadManifest();
          const merged = mergeManifests(current, remote);
          await saveManifestToOpfs(merged);
          const cid = await persistManifestToIpfs(helia, merged);
          await saveRoot(cid);
          setManifest(merged);
          // announce merged state to speed up convergence
          handle.announceNow().catch(() => {});
        } catch (e) {
          console.warn("Failed to merge remote manifest", e);
        }
      });
      setSyncHandle(handle);
    })();
  }, []);

  if (!helia || !manifest)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-gray-600 mb-2">Starting node</div>
          <div className="animate-pulse">•••</div>
        </div>
      </div>
    );

  async function onManifestChange(next: Manifest, newCid: string | null) {
    setManifest(next);
    if (newCid) {
      await saveRoot(newCid);
      // publish right away
      syncHandle?.announceNow().catch(() => {});
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <h1 className="text-xl font-semibold">picc.fit</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPairOpen(true)}
              className="btn btn-secondary"
            >
              Pair Device
            </button>
            <a
              href="https://indexed.fit"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-gray-600 hover:text-gray-900"
            >
              [i]indexed.fit
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto">
        <GalleryView helia={helia} onManifestChange={onManifestChange} />
      </main>

      <footer className="border-t border-gray-200 mt-8 p-4">
        <div className="max-w-screen-2xl mx-auto grid md:grid-cols-3 gap-4">
          <div className="box p-4">
            <PeerManager helia={helia} />
          </div>
          <div className="box p-4 text-sm text-gray-600">
            <h3 className="font-semibold mb-2">System Info</h3>
            <ul className="space-y-1 text-xs">
              <li>• Manifest + peers: OPFS storage</li>
              <li>• Media blocks: OPFS blockstore</li>
              <li>• Network: libp2p + circuit relay</li>
            </ul>
          </div>
          <div className="box p-4">
            {syncHandle && <SyncPanel helia={helia} handle={syncHandle} />}
          </div>
        </div>
      </footer>

      <PairingDialog
        open={pairOpen}
        onClose={() => setPairOpen(false)}
        helia={helia}
      />
    </div>
  );
}
