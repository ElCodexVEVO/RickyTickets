import { lazy, Suspense, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useDialog } from "@/lib/useDialog";
const CreateTicketPage = lazy(() => import("@/pages/CreateTicketPage"));
export function AppShell() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("rt-sidebar-collapsed") === "true",
  );
  const [composer, setComposer] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [docked, setDocked] = useState(
    () => window.matchMedia("(min-width: 1600px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1600px)");
    const update = () => setDocked(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const drawerRef = useDialog<HTMLElement>(composer && !docked, () =>
    setComposer(false),
  );
  useEffect(() => {
    if (!composer || !docked) return;
    const frame = requestAnimationFrame(() =>
      drawerRef.current?.focus({ preventScroll: true }),
    );
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        drawerRef.current?.contains(document.activeElement)
      )
        setComposer(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", escape);
    };
  }, [composer, docked, drawerRef]);
  function openComposer() {
    setInitialized(true);
    setComposer(true);
  }
  function toggleSidebar() {
    setCollapsed((v) => {
      localStorage.setItem("rt-sidebar-collapsed", String(!v));
      return !v;
    });
  }
  return (
    <div
      className={`app-shell min-h-screen bg-surface-950 lg:grid ${composer ? "composer-open" : ""}`}
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
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          onCreate={openComposer}
        />
        <main className="min-w-0 flex-1 p-4 xl:px-5">
          <Outlet />
        </main>
      </div>
      {initialized && (
        <div hidden={!composer} className="composer-host">
          <div
            className="composer-backdrop"
            onClick={() => setComposer(false)}
          />
          <section
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal={!docked}
            aria-label="Nueva reservación"
            className="reservation-composer"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4">
              <div>
                <h2 className="text-base font-semibold">Nueva reservación</h2>
                <p className="mt-1 text-[11px] text-ink-500">
                  Crea una nueva reservación en pocos pasos
                </p>
              </div>
              <button
                title="Cerrar y conservar borrador"
                aria-label="Cerrar y conservar borrador"
                onClick={() => setComposer(false)}
                className="rounded-lg p-1 text-ink-700 hover:bg-carbon-800"
              >
                <X size={18} />
              </button>
            </div>
            <Suspense
              fallback={<p className="p-4 text-xs">Cargando formulario…</p>}
            >
              <CreateTicketPage embedded />
            </Suspense>
          </section>
        </div>
      )}
    </div>
  );
}
