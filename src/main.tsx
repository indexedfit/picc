import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PerfHud } from "./components/PerfHud";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PerfHud />
    <App />
  </React.StrictMode>,
);
