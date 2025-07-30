import { useEffect, useState } from "react";
// import { loadAllowedPeers, saveAllowedPeers } from "../lib/identity";
import type { Helia } from "helia";

export default function PeerManager({ helia }: { helia: Helia }) {
  const [peers, setPeers] = useState<string[]>([]);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Allowed Peers</h3>
      {peers.length === 0 ? (
        <p className="text-sm text-gray-500">None</p>
      ) : (
        <ul className="space-y-1">
          {peers.map((p) => (
            <li key={p} className="flex items-center justify-between text-sm">
              <span className="font-mono truncate">{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
