import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import HydrationGate from "./components/HydrationGate"; 

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <HydrationGate>
        <App />
      </HydrationGate>
    </BrowserRouter>
  </React.StrictMode>
);
