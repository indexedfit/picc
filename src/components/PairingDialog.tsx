import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Html5QrcodeScanner } from "html5-qrcode";
import type { Helia } from "helia";
import {
  loadAllowedPeers,
  saveAllowedPeers,
  loadRoot,
  saveRoot,
} from "../lib/identity";
import { loadConfig } from "../lib/config";

interface PairPayload {
  peerId: string;
  addrs: string[];
  topic: string;
  root?: string | null;
}

export default function PairingDialog({
  open,
  onClose,
  helia,
}: {
  open: boolean;
  onClose: () => void;
  helia: Helia;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(false);

  function pickDialableAddrs(addrs: string[]): string[] {
    return addrs
      .map(String)
      .filter(a =>
        a.includes('/p2p-circuit') || a.includes('/wss/') || a.includes('/ws/')
      );
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      // let relays populate
      await new Promise(r => setTimeout(r, 4000));
      const cfg = await loadConfig();
      const topic = cfg.pubsubNamespace;
      const addrs = helia.libp2p.getMultiaddrs().map(String);
      const payload: PairPayload = {
        peerId: helia.libp2p.peerId.toString(),
        addrs: pickDialableAddrs(addrs),
        topic,
        root: (await loadRoot()).manifestCid ?? null,
      };
      console.log("Pair QR payload", payload);
      await QRCode.toCanvas(canvasRef.current, JSON.stringify(payload));
    })();
  }, [open, helia]);

  useEffect(() => {
    if (!open || !scanning || !scanRef.current) return;
    const el = scanRef.current;
    const scanner = new Html5QrcodeScanner(
      el.id,
      { fps: 10, qrbox: 250 },
      /* verbose */ false,
    );
    scanner.render(async (text: string) => {
      try {
        const payload = JSON.parse(text) as PairPayload;
        const peers = await loadAllowedPeers();
        const id =
          payload.peerId ??
          (payload.addrs?.[0]?.split("/p2p/").pop() ?? "");
        if (id) peers.add(id);
        await saveAllowedPeers(peers);

        // Adopt remote root if we don't have one
        const localRoot = (await loadRoot()).manifestCid;
        if (!localRoot && payload.root) await saveRoot(payload.root);

        // Immediately dial all addresses
        for (const a of payload.addrs ?? []) {
          try { await helia.libp2p.dial(a as any); } catch {}
        }

        // Publish a sync request on the topic
        try {
          const ps = helia.libp2p.services.pubsub as any;
          const msg = new TextEncoder().encode(JSON.stringify({ type: "request", timestamp: Date.now() }));
          await ps.publish(payload.topic ?? "gallery-sync", msg);
        } catch {}

        alert("Paired!");
        scanner.clear();
        setScanning(false);
        onClose();
      } catch (e) {
        console.error(e);
      }
    }, (errorMessage: any) => {
      console.warn("QR scan error:", errorMessage);
    });
    return () => {
      try {
        scanner.clear();
      } catch {}
    };
  }, [open, scanning, helia, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4 shadow-lg">
        <h2 className="text-xl font-bold">Device Pairing</h2>
        <p className="text-sm text-gray-500">
          Scan this QR on the other device, or scan theirs.
        </p>
        <canvas ref={canvasRef} className="mx-auto" />
        <div id="qr-scan" ref={scanRef} className="w-full" />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setScanning((s) => !s)}
            className="btn btn-secondary w-full"
          >
            {scanning ? "Stop Scan" : "Scan Other QR"}
          </button>
          <button onClick={onClose} className="btn btn-primary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
