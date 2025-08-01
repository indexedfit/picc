import React, { useEffect, useRef, useState } from "react";
import type { AlbumDoc } from "../yjs/albums";

export function ChatPane({ album }: { album: AlbumDoc }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(album.chat.toArray());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const obs = () => setMsgs(album.chat.toArray());
    album.chat.observe(obs);
    return () => album.chat.unobserve(obs);
  }, [album]);

  const send = () => {
    const text = inputRef.current?.value.trim();
    if (!text) return;
    album.doc.transact(() => {
      album.chat.push([{ from: "me", ts: Date.now(), msg: text }]);
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white rounded-full shadow-lg"
      >
        💬
      </button>
      {open && (
        <div className="fixed bottom-16 right-4 w-64 h-72 bg-white border rounded flex flex-col shadow-lg">
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={`${m.from === "me" ? "text-right" : ""}`}>
                {m.msg}
              </div>
            ))}
          </div>
          <div className="border-t p-2 flex gap-1">
            <input
              ref={inputRef}
              className="flex-1 border px-2 py-1 rounded text-sm"
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
              onClick={send}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
