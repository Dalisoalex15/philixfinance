import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ToastContainer from "../ui/ToastContainer";
import { useState } from "react";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-[#060F1E]">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Slim top bar with toggle + user context */}
        <div className="h-14 border-b border-white/5 flex items-center px-5 gap-3 flex-shrink-0">
          <div className="flex-1" />
        </div>
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
