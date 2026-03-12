import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ScrollToTop } from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Disclaimer from "./pages/Disclaimer";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Scorecard from "./pages/Scorecard";
import Blog from "./pages/Blog";
import HowItWorks from "./pages/HowItWorks";
import Changelog from "./pages/Changelog";
import SharedAnalysis from "./pages/SharedAnalysis";
import NotFound from "./pages/NotFound";
import CookieBanner from "./components/CookieBanner";
import UpdatePrompt from "./components/UpdatePrompt";
import { toast } from "sonner";

const queryClient = new QueryClient();

const GlobalErrorHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[App] Unhandled rejection:", event.reason);
      toast.error("Something went wrong. Please try again.");
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <GlobalErrorHandler>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/welcome" element={<Landing />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/scorecard" element={<Scorecard />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/changelog" element={<Changelog />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CookieBanner />
                <UpdatePrompt />
              </BrowserRouter>
            </TooltipProvider>
          </GlobalErrorHandler>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
