import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/components/auth/auth-provider";
import { UserAuthProvider } from "@/components/auth/user-auth-provider";

createRoot(document.getElementById("root")!).render(
  <UserAuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </UserAuthProvider>
);
