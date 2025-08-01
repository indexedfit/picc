import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { useEffect, useMemo, useState } from "react";
import type { PicMeta } from "../types";

export interface AlbumDoc {
  pics: Y.Array<PicMeta>; // ordered list of pictures
  chat: Y.Array<{ from: string; msg: string; ts: number }>;
  doc: Y.Doc;
}

/** Create/load a Y.Doc for an album; persist to IndexedDB. */
export function useAlbumDoc(name: string) {
  const [ready, setReady] = useState(false);

  const album = useMemo<AlbumDoc>(() => {
    const doc = new Y.Doc();
    // One top‑level map makes GC easy if we need sub‑docs later
    const pics = doc.getArray<PicMeta>("pics");
    const chat = doc.getArray("chat");

    // Temporary pubkey – will be replaced with WASM crypto keypair
    if (!localStorage.getItem("pubkey")) {
      localStorage.setItem("pubkey", crypto.randomUUID());
    }

    // Persist locally
    const persistence = new IndexeddbPersistence(`piccfit-${name}`, doc);
    persistence.once("synced", () => setReady(true));

    return { pics, chat, doc };
  }, [name]);

  return { album, ready } as const;
}
