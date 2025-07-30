// src/lib/opfs.ts
// Minimal OPFS helpers for JSON/text persistence with clean, explicit paths.

import { OPFS_DIR_NAME } from "./constants";

export type JsonValue = unknown;

// --- worker rpc (only used on WebKit fallback) ---
let _worker: Worker | null = null;
let _rpcId = 0;
const _pending = new Map<
  number,
  (reply: { ok: boolean; error?: string }) => void
>();

function _getWorker(): Worker {
  if (_worker) return _worker;
  _worker = new Worker(new URL("./opfs-worker.ts", import.meta.url), {
    type: "module",
  });
  _worker.onmessage = (
    ev: MessageEvent<{ id: number; ok: boolean; error?: string }>,
  ) => {
    const fn = _pending.get(ev.data.id);
    if (fn) {
      _pending.delete(ev.data.id);
      fn({ ok: ev.data.ok, error: ev.data.error });
    }
  };
  return _worker;
}

function _callWorker(msg: Record<string, unknown>): Promise<void> {
  const id = ++_rpcId;
  const w = _getWorker();
  return new Promise((resolve, reject) => {
    _pending.set(id, (r) =>
      r.ok ? resolve() : reject(new Error(r.error || "Worker error")),
    );
    w.postMessage({ ...msg, id });
  });
}

// --- directory helpers ---
async function getAppDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
}

export async function getDir(
  path: string[],
): Promise<FileSystemDirectoryHandle> {
  let dir = await getAppDir();
  for (const part of path) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  return dir;
}

// --- read/write helpers ---
export async function writeText(
  path: string[],
  filename: string,
  text: string,
): Promise<void> {
  const dir = await getDir(path);
  const fh = await dir.getFileHandle(filename, { create: true });

  // Fast path (Chromium/Firefox): WritableFileStream on main thread
  if ("createWritable" in fh) {
    // @ts-ignore - in TS DOM lib this may not exist on all targets
    const w: FileSystemWritableFileStream = await (fh as any).createWritable();
    await w.write(text);
    await w.close();
    return;
  }

  // WebKit fallback: use worker + SyncAccessHandle
  await _callWorker({ op: "writeText", path, filename, text });
}

export async function readText(
  path: string[],
  filename: string,
): Promise<string | null> {
  try {
    const dir = await getDir(path);
    const fh = await dir.getFileHandle(filename, { create: false });
    const file = await fh.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

export async function writeJson(
  path: string[],
  filename: string,
  value: JsonValue,
): Promise<void> {
  await writeText(path, filename, JSON.stringify(value, null, 2));
}

export async function readJson<T = any>(
  path: string[],
  filename: string,
): Promise<T | null> {
  const txt = await readText(path, filename);
  if (txt === null) return null;
  try {
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

export async function exists(
  path: string[],
  filename: string,
): Promise<boolean> {
  const dir = await getDir(path);
  try {
    await dir.getFileHandle(filename, { create: false });
    return true;
  } catch {
    return false;
  }
}

export async function remove(path: string[], filename: string): Promise<void> {
  // Try main thread first; if it fails (busy/locked), ask worker
  try {
    const dir = await getDir(path);
    await dir.removeEntry(filename);
  } catch {
    await _callWorker({ op: "remove", path, filename });
  }
}
