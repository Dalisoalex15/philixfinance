import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403/404
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Philix] Unhandled render error:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#020617",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "16px", padding: "32px",
          fontFamily: "system-ui, sans-serif",
        }}>
          <div style={{ color: "#f59e0b", fontSize: "40px" }}>⚠</div>
          <div style={{ color: "#e2e8f0", fontSize: "18px", fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ color: "#64748b", fontSize: "13px", maxWidth: "400px", textAlign: "center" }}>
            {this.state.error.message}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#4f46e5", color: "white", border: "none",
                padding: "10px 24px", borderRadius: "10px", cursor: "pointer",
                fontSize: "14px", fontWeight: 600,
              }}
            >
              Reload page
            </button>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
                padding: "10px 24px", borderRadius: "10px", cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "#7f1d1d", color: "#fecaca", padding: "10px 16px",
      textAlign: "center", fontSize: "13px", fontWeight: 600,
      fontFamily: "system-ui, sans-serif",
    }}>
      No internet connection — some features may not work
    </div>
  );
}

// Catch unhandled promise rejections and log them (don't crash)
window.addEventListener("unhandledrejection", (e) => {
  console.error("[Philix] Unhandled promise rejection:", e.reason);
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineBanner />
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
