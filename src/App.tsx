import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppRoutes from "./AppRoutes";
import ErrorBoundary from "@/components/ErrorBoundary";
import { initGlobalErrorTracking } from "@/utils/errorTracker";

const queryClient = new QueryClient();

const AppInner = () => {
  useEffect(() => {
    initGlobalErrorTracking();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
);

export default App;
