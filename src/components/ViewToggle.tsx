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
    <div className="view-toggle">
      <button
        className={`view-toggle-btn ${view === "grid" ? "active" : ""}`}
        onClick={() => setView("grid")}
      >
        <LayoutGrid size={18} />
      </button>
      <button
        className={`view-toggle-btn ${view === "list" ? "active" : ""}`}
        onClick={() => setView("list")}
      >
        <List size={18} />
      </button>
    </div>
  );
}
