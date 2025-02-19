import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import { SearchProvider } from "./lib/SearchContext";
import { AuthProvider } from "./lib/AuthContext";
import { ThemeProvider } from "./lib/ThemeContext";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="soundwave-theme">
          <SearchProvider>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
            <Toaster />
          </SearchProvider>
        </ThemeProvider>
      </AuthProvider>
    </Suspense>
  );
}

export default App;
