import React, { useEffect, useMemo, useState } from "react";
import type { PicMeta } from "../types";
import { rawUrl } from "../utils/opfs";

export function Lightbox({
  pics,
  index,
  onClose,
  setIndex,
}: {
  pics: PicMeta[];
  index: number;
  onClose: () => void;
  setIndex: (i: number) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const pic = pics[index];

  useEffect(() => {
    let alive = true;
    let createdUrl: string | null = null;
    setUrl(null);
    rawUrl(pic.cid).then((u) => {
      if (!alive || !u) return;
      createdUrl = u;
      setUrl(u);
    });
    return () => {
      alive = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [pic.cid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((index - 1 + pics.length) % pics.length);
      if (e.key === "ArrowRight") setIndex((index + 1) % pics.length);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [index, pics.length, onClose, setIndex]);

  if (!url) return null;

  const goPrev = () => setIndex((index - 1 + pics.length) % pics.length);
  const goNext = () => setIndex((index + 1) % pics.length);

  const isVideo = pic.type.startsWith("video/");

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-btn lightbox-close" onClick={onClose} aria-label="Close">×</button>
      <button className="lightbox-btn lightbox-left" onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous">‹</button>
      <button className="lightbox-btn lightbox-right" onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next">›</button>
      <div className="lightbox-center" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video className="lightbox-media" src={url} controls autoPlay loop playsInline />
        ) : (
          <img className="lightbox-media" src={url} alt={pic.name} />
        )}
      </div>
    </div>
  );
}