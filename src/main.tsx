import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import debug utilities for development
import './lib/registrationDebugUtils';

createRoot(document.getElementById("root")!).render(<App />);
