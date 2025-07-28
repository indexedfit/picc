// Minimal OPFS helpers for JSON/text persistence with clean, explicit paths.
// Everything is persisted under /opfs/app/opfs-gallery/<...>

export type JsonValue = unknown;

const APP_DIR = "opfs-gallery";

async function getAppDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(APP_DIR, { create: true });
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

export async function writeText(
  path: string[],
  filename: string,
  text: string,
): Promise<void> {
  const dir = await getDir(path);
  const fh = await dir.getFileHandle(filename, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
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
  if (!txt) return null;
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
  const dir = await getDir(path);
  try {
    await dir.removeEntry(filename);
  } catch {}
}
