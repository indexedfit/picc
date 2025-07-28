import { useEffect, useRef, useState } from "react";
import type { Helia } from "helia";
import type { FileEntry } from "../lib/manifest";

interface Props {
  helia: Helia;
  files: FileEntry[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function FullscreenViewer({ helia, files, currentIndex, onClose, onNavigate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentFile = files[currentIndex];

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < files.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < files.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [currentIndex, files.length, onClose, onNavigate]);

  // Focus container for keyboard events
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  if (!currentFile) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      tabIndex={-1}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl z-10"
      >
        ×
      </button>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="absolute left-4 text-white hover:text-gray-300 text-3xl z-10"
        >
          ‹
        </button>
      )}
      
      {currentIndex < files.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="absolute right-4 text-white hover:text-gray-300 text-3xl z-10"
        >
          ›
        </button>
      )}

      {/* Image counter */}
      <div className="absolute top-4 left-4 text-white text-sm">
        {currentIndex + 1} / {files.length}
      </div>

      {/* Main content */}
      <div 
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <FullscreenMedia helia={helia} file={currentFile} />
      </div>

      {/* File name */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
        {currentFile.name}
      </div>
    </div>
  );
}

// Component to handle media rendering in fullscreen
function FullscreenMedia({ helia, file }: { helia: Helia; file: FileEntry }) {
  const [url, setUrl] = useState<string>("");
  
  useEffect(() => {
    const ac = new AbortController();
    let revoked = false;

    (async () => {
      try {
        const { unixfs } = await import("@helia/unixfs");
        const fs = unixfs(helia);
        
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of fs.cat(file.cid as any, { signal: ac.signal })) {
                controller.enqueue(chunk);
              }
              controller.close();
            } catch (err: any) {
              if (err?.name === "AbortError") return;
              throw err;
            }
          },
        });

        const resp = new Response(stream);
        const blob = await resp.blob();
        if (!revoked) {
          const objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      } catch (e) {
        console.warn("Preview failed for CID", file.cid, e);
      }
    })();

    return () => {
      ac.abort();
      revoked = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [helia, file.cid, url]);

  if (!url) return (
    <div className="flex items-center justify-center text-white">
      <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
    </div>
  );

  if (/\.(mp4|webm|mov)$/i.test(file.name))
    return <video src={url} controls className="max-w-full max-h-full" autoPlay />;
  
  if (/\.(mp3|wav|ogg)$/i.test(file.name))
    return (
      <div className="bg-gray-800 p-8 rounded">
        <audio src={url} controls autoPlay />
      </div>
    );
  
  return <img src={url} alt={file.name} className="max-w-full max-h-full object-contain" />;
}