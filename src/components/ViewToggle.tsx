import React from "react";
import { LayoutGrid, List } from "lucide-react";

export type View = "grid" | "list";
export function ViewToggle({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  return (
    <div className="flex">
      <button
        className={`p-1 ${view === "grid" ? "text-blue-600" : ""}`}
        onClick={() => setView("grid")}
      >
        <LayoutGrid size={18} />
      </button>
      <button
        className={`p-1 ${view === "list" ? "text-blue-600" : ""}`}
        onClick={() => setView("list")}
      >
        <List size={18} />
      </button>
    </div>
  );
}
