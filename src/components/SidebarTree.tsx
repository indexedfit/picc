// src/components/SidebarTree.tsx (minimal - legacy component)
import { Manifest } from "../lib/manifest";

export default function SidebarTree({
  manifest: _manifest,
  current: _current,
  onOpen: _onOpen,
}: {
  manifest: Manifest;
  current: string;
  onOpen: (id: string) => void;
}) {
  // This is a legacy component - the main TreeView is used instead
  return (
    <aside className="w-64 shrink-0 overflow-y-auto">
      <div className="p-4 text-gray-500 text-sm">
        Legacy component - use TreeView instead
      </div>
    </aside>
  );
}
