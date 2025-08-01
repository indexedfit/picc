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
        className="chat-button"
      >
        💬
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-messages">
            {msgs.map((m, i) => (
              <div key={i} className={`chat-message ${m.from === "me" ? "me" : "other"}`}>
                {m.msg}
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              className="chat-send-btn"
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
