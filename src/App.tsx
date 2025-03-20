import { Suspense } from "react";
import { Routes, Route, useRoutes } from "react-router-dom";
import Home from "./components/home";
import { SearchProvider } from "./lib/SearchContext";
import { AuthProvider } from "./lib/AuthContext";
import { ThemeProvider } from "./lib/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import routes from "tempo-routes";

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="soundwave-theme">
          <SearchProvider>
            {import.meta.env.VITE_TEMPO && useRoutes(routes)}
            <Routes>
              <Route path="/" element={<Home />} />
              {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}
            </Routes>
            <Toaster />
          </SearchProvider>
        </ThemeProvider>
      </AuthProvider>
    </Suspense>
  );
}

export default App;
