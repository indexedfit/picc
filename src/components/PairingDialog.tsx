import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Html5QrcodeScanner } from "html5-qrcode";
import type { Helia } from "helia";

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
  const [status, setStatus] = useState<
    "preparing" | "ready" | "scanning" | "connected"
  >("preparing");
  const [lastAddrs, setLastAddrs] = useState<string[]>([]);

  function pickDialableAddrs(addrs: string[]): string[] {
    return addrs
      .map(String)
      .filter((a) => /\/(webrtc|webtransport|wss?|p2p-circuit)\b/.test(a));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-sm space-y-4 shadow-lg">
        <h2 className="text-xl font-bold">Device Pairing</h2>
        <p className="text-sm text-gray-500">
          {status === "preparing" && "Preparing network…"}
          {status === "ready" && "Scan this QR on the other device."}
          {status === "scanning" && "Scanning…"}
          {status === "connected" && "Connected!"}
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
