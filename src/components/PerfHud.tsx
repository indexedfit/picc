import React, { useEffect, useRef, useState } from 'react';
import { getBytesWritten } from '../utils/opfs';

export function PerfHud() {
  const [fps, setFps] = useState(0);
  const [mbs, setMbs] = useState(0);
  const lastBytes = useRef(0);

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
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, []);

  return (
    <div className="fixed bottom-2 right-2 text-xs bg-black text-white bg-opacity-70 rounded px-2 py-1 pointer-events-none z-50">
      {fps} fps | {mbs} MB/s
    </div>
  );
}
