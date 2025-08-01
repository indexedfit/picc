import React, { useEffect, useRef, useState } from "react";
import { getBytesWritten } from "../utils/opfs";
export function PerfHud() {
  const [fps, setFps] = useState(0);
  const [mbs, setMbs] = useState(0);
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(0);
  const lastBytes = useRef(0);
  const lastProgressBytes = useRef(0);
  useEffect(() => {
    navigator.storage &&
      navigator.storage.estimate().then((e) => {
        setUsage(e.usage || 0);
        setQuota(e.quota || 0);
      });
  }, []);
  useEffect(() => {
    let count = 0;
    let last = performance.now();
    const loop = () => {
      count++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(count);
        count = 0;
        last = now;
        const bytes = getBytesWritten();
        setMbs(((bytes - lastBytes.current) / 1_000_000).toFixed(2) as any);
        lastBytes.current = bytes;
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then((e) => {
            setUsage(e.usage || 0);
            setQuota(e.quota || 0);
          });
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, []);
  const progBytes = getBytesWritten() - lastProgressBytes.current;
  const percent = quota ? usage / quota : 0;
  return (
    <div
      className="fixed bottom-2 right-2 text-xs bg-black text-white bg-opacity-70 rounded px-2 py-1 z-50"
      style={{ minWidth: 120 }}
    >
      <div>
        {fps} fps | {mbs} MB/s
      </div>
      <div className="w-full h-1 bg-gray-700 rounded overflow-hidden mt-1">
        <div
          className="bg-green-400 h-full"
          style={{ width: `${(percent * 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}
