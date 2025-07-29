import { useEffect, useState } from "react";
import type { Helia } from "helia";
import type { SyncHandle, SyncStatus } from "../lib/sync";

export default function SyncPanel({ handle }: { helia: Helia; handle: SyncHandle }) {
  const [status, setStatus] = useState<SyncStatus>(handle.getStatus());

  useEffect(() => {
    return handle.subscribe(setStatus);
  }, [handle]);

  const short = (cid?: string | null) =>
    cid ? cid.slice(0, 6) + "…" + cid.slice(-6) : "—";

  return (
    <div className="text-xs text-gray-700 space-y-2">
      <h3 className="font-semibold text-sm">Sync</h3>
      <ul className="space-y-1">
        <li><span className="text-gray-500">Topic:</span> <code>{status.topic}</code></li>
        <li><span className="text-gray-500">Peer:</span> <code>{status.peerId}</code></li>
        <li>
          <span className="text-gray-500">Peers:</span>{" "}
          <span>{status.connectedPeers.length}</span>
        </li>
        {status.connectedPeers.length > 0 && (
          <li className="max-h-16 overflow-auto">
            {status.connectedPeers.map(p => (
              <code key={p} className="block">{p}</code>
            ))}
          </li>
        )}
        <li>
          <span className="text-gray-500">Last announced:</span>{" "}
          <code>{short(status.lastAnnounced?.cid)}</code>{" "}
          <span className="text-gray-400">
            {status.lastAnnounced?.at ? new Date(status.lastAnnounced.at).toLocaleTimeString() : ""}
          </span>
        </li>
        <li>
          <span className="text-gray-500">Last remote:</span>{" "}
          <code>{short(status.lastRemote?.cid)}</code>{" "}
          {status.lastRemote?.from && <span className="text-gray-400">from {status.lastRemote.from.slice(0,8)}…</span>}{" "}
          <span className="text-gray-400">
            {status.lastRemote?.at ? new Date(status.lastRemote.at).toLocaleTimeString() : ""}
          </span>
        </li>
        <li>
          <span className="text-gray-500">Counters:</span>{" "}
          pub {status.publishedCount} · recv {status.receivedCount}
        </li>
      </ul>

      <div className="pt-2">
        <button
          className="btn btn-primary w-full"
          onClick={() => handle.announceNow().catch(() => {})}
        >
          Announce now
        </button>
      </div>
    </div>
  );
}