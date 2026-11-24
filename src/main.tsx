import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
// Readable font option (#34); the files only load once Settings turns it on.
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/600.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/atkinson-hyperlegible-next/800.css";
import "./styles.css";
import "./i18n";
import "./theme";
import { AppProvider } from "./store";
import { CloudGate } from "./CloudGate";
import { InstallPrompt } from "./InstallPrompt";
import { registerPwa } from "./pwa";
import App from "./App";
import { isCompanion } from "./db";
import { registerOfflinePage } from "./companion";

if (isCompanion) registerOfflinePage();
registerPwa();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <CloudGate>
        <App />
      </CloudGate>
      <InstallPrompt appName="Studigo" icon="/icon-192.png" storageKey="studigo.install" />
    </AppProvider>
  </React.StrictMode>,
);
