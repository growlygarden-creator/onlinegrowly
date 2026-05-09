import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { I18nProvider } from "./lib/i18n";
import "./styles.css";

const routerBaseName = window.location.pathname === "/app" || window.location.pathname.startsWith("/app/")
  ? "/app"
  : undefined;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter basename={routerBaseName}>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>,
);
