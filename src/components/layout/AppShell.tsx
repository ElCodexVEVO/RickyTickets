import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
export function AppShell() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("rt-sidebar-collapsed") === "true",
  );
  function toggleSidebar() {
    setCollapsed((v) => {
      localStorage.setItem("rt-sidebar-collapsed", String(!v));
      return !v;
    });
  }
  return (
    <div
      className="app-shell min-h-screen bg-surface-950 lg:grid"
      style={
        {
          "--sidebar-width": collapsed ? "68px" : "214px",
          gridTemplateColumns: `${collapsed ? "68px" : "214px"} minmax(0,1fr)`,
        } as CSSProperties
      }
    >
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        </div>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-carbon-950/75"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-2 top-2 rounded-lg bg-carbon-800 p-1 text-ink-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 p-4 xl:px-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
