import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import { SearchProvider } from "./lib/SearchContext";
import { AuthProvider } from "./lib/AuthContext";
import { ThemeProvider } from "./lib/ThemeContext";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="soundwave-theme">
      <AuthProvider>
        <SearchProvider>
          <Suspense fallback={<p>Loading...</p>}>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </Suspense>
        </SearchProvider>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
