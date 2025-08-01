# TODO

## UI

- Switchable gallery / list view
- Album naming & selector UI
- Upload progress bars (per file & global)
- Perf HUD: FPS + OPFS throughput
- Keyboard shortcuts (←/→, u upload, ⌘d delete…)
- Mobile polish: bottom nav, pinch‑zoom, swipe‑dismiss
- Drag‑&‑drop / paste / share‑sheet importing

## Yjs / Sync

- Per‑album chat pane
- Share link / QR (room‑hash + token)
- PeerJS WebRTC provider for LAN sync
- WebSocket relay fallback
- Presence & typing indicators

## Storage / Performance

- Skip OPFS write if CID exists (de‑dup)
- LRU thumbnail cache eviction
- Video key‑frame thumb generation
- Background EXIF parse (orientation, date)

## Security / Permissions

- Capability tokens: read / add / admin

## Nice‑to‑haves

- PWA + Web Share Target (Android)
- Add‑to‑home‑screen manifest & icon
- WASM SQLite full‑text search
- Face clustering (ML worker, later)
