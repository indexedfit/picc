// Manifest manages the logical gallery (list of files).
// It lives in OPFS as JSON for fast reload, and is also added to IPFS to get a CID.
// The CID is what we exchange with peers during sync/pubsub.

import { unixfs as createUnixfs } from "@helia/unixfs";
import type { Helia } from "helia";
import { readJson, writeJson } from "./opfs";
import { saveRoot, loadRoot } from "./identity";

const PATH = ["state"];
const FILE = "manifest.json";

export interface FileEntry {
  id: string; // stable ID (e.g., uuid or deterministic hash)
  cid: string; // UnixFS CID of file
  name: string;
  path?: string; // folder path e.g. "vacation/2024" or undefined for root
  mime?: string;
  size?: number;
  addedAt: string; // ISO
  updatedAt?: string; // ISO
  deleted?: boolean;
}

export interface FolderEntry {
  id: string;
  name: string;
  path?: string; // parent path, undefined for root folders
  description?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface Manifest {
  version: 1;
  files: Record<string, FileEntry>; // key by id
  folders?: Record<string, FolderEntry>; // key by full path
}

export async function createEmptyManifest(): Promise<Manifest> {
  const m: Manifest = { version: 1, files: {} };
  await writeJson(PATH, FILE, m);
  await saveRoot(null);
  return m;
}

export async function loadManifest(): Promise<Manifest> {
  const data = await readJson<Manifest>(PATH, FILE);
  if (data && data.version === 1) return data;
  return await createEmptyManifest();
}

export function mergeManifests(base: Manifest, incoming: Manifest): Manifest {
  const merged: Manifest = { 
    version: 1, 
    files: { ...base.files },
    folders: { ...(base.folders || {}) }
  };
  
  // Merge files
  for (const [id, inc] of Object.entries(incoming.files)) {
    const cur = merged.files[id];
    if (!cur) {
      merged.files[id] = inc;
      continue;
    }
    const curTs = Date.parse(cur.updatedAt ?? cur.addedAt);
    const incTs = Date.parse(inc.updatedAt ?? inc.addedAt);
    if (incTs > curTs) merged.files[id] = inc;
  }
  
  // Merge folders
  if (incoming.folders) {
    for (const [path, inc] of Object.entries(incoming.folders)) {
      const cur = merged.folders![path];
      if (!cur) {
        merged.folders![path] = inc;
        continue;
      }
      const curTs = Date.parse(cur.updatedAt ?? cur.createdAt);
      const incTs = Date.parse(inc.updatedAt ?? inc.createdAt);
      if (incTs > curTs) merged.folders![path] = inc;
    }
  }
  
  return merged;
}

export async function saveManifestToOpfs(manifest: Manifest): Promise<void> {
  await writeJson(PATH, FILE, manifest);
}

// Ensure deterministic JSON for CID stability.
function stableStringify(manifest: Manifest): string {
  const sortObj = (o: any): any => {
    if (Array.isArray(o)) return o.map(sortObj);
    if (o && typeof o === 'object') {
      return Object.fromEntries(
        Object.keys(o).sort().map(k => [k, sortObj(o[k])])
      );
    }
    return o;
  };
  return JSON.stringify(sortObj(manifest));
}

// Add manifest JSON to IPFS to obtain a CID; also persist root CID in OPFS.
export async function persistManifestToIpfs(
  helia: Helia,
  manifest: Manifest,
): Promise<string> {
  const fs = createUnixfs(helia);
  const bytes = new TextEncoder().encode(stableStringify(manifest));
  const cid = await fs.addBytes(bytes);
  await saveRoot(cid.toString());
  return cid.toString();
}

// Load the current root manifest from OPFS (if we have a CID persisted) –
// then fetch & decode it from IPFS to ensure we are in sync with the content-addressed state.
export async function loadRootManifestFromIpfs(
  helia: Helia,
): Promise<Manifest | null> {
  const { manifestCid } = await loadRoot();
  if (!manifestCid) return null;
  try {
    const fs = createUnixfs(helia);
    let text = "";
    const dec = new TextDecoder();
    for await (const chunk of fs.cat(manifestCid as any)) {
      text += dec.decode(chunk, { stream: true });
    }
    const parsed = JSON.parse(text) as Manifest;
    if (parsed?.version === 1) {
      // Also mirror to OPFS so refresh with no network still works.
      await saveManifestToOpfs(parsed);
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return null;
}
