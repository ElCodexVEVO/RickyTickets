import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FilePlus2,
  CalendarRange,
  CalendarDays,
  Users,
  Car,
  IdCard,
  BarChart3,
  Settings,
  UserCog,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import logoUrl from "@/assets/logo.png";
const groups = [
  {
    label: "Operación",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/ticket/nuevo", label: "Nueva reservación", icon: FilePlus2 },
      { to: "/agenda", label: "Agenda / Servicios", icon: CalendarDays },
      { to: "/reservaciones", label: "Reservaciones", icon: CalendarRange },
    ],
  },
  {
    label: "Directorio",
    items: [
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/conductores", label: "Conductores", icon: IdCard },
      { to: "/vehiculos", label: "Vehículos", icon: Car },
    ],
  },
  {
    label: "Gestión",
    admin: true,
    items: [
      { to: "/reportes", label: "Reportes", icon: BarChart3 },
      { to: "/usuarios", label: "Usuarios", icon: UserCog },
      { to: "/configuracion", label: "Configuración", icon: Settings },
      { to: "/actividad", label: "Actividad", icon: History },
    ],
  },
];
export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const { profile, isAdmin, signOut } = useAuth();
  const connection = useQuery({
    queryKey: ["connection"],
    queryFn: async () => {
      const { error } = await supabase
        .from("settings")
        .select("key", { head: true, count: "exact" });
      if (error) throw error;
      return true;
    },
    refetchInterval: 60000,
    retry: 0,
  });
  return (
    <div className="sidebar-scenery flex h-full flex-col border-r border-line bg-carbon-950 text-cream-50">
      <div
        className={clsx(
          "flex flex-col items-center border-b border-line",
          collapsed ? "px-2 py-4" : "px-5 pb-4 pt-3",
        )}
      >
        <img
          src={logoUrl}
          alt="Danny Transfers"
          className={
            collapsed ? "h-12 w-12 object-contain" : "h-32 w-44 object-cover"
          }
        />
        {!collapsed && (
          <div className="text-center">
            <p className="text-[10px] tracking-[.12em] text-ink-700">
              RickyTickets V2
            </p>
          </div>
        )}
      </div>
      <nav
        aria-label="Navegación principal"
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
      >
        {groups
          .filter((g) => !g.admin || isAdmin)
          .map((g) => (
            <div key={g.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] uppercase tracking-[.13em] text-ink-500">
                  {g.label}
                </p>
              )}
              <div className="space-y-1">
                {g.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={"end" in item ? item.end : false}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 rounded-md border-l-2 py-2 text-[13px] transition-colors duration-200",
                        collapsed ? "justify-center px-2" : "px-3",
                        isActive
                          ? "border-gold-400 bg-gold-500/25 text-cream-100"
                          : "border-transparent text-ink-700 hover:bg-carbon-800 hover:text-cream-50",
                      )
                    }
                  >
                    <item.icon size={17} className="shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
      </nav>
      <div className="border-t border-line p-3">
        <div
          title={
            connection.isSuccess
              ? "Supabase conectado"
              : "Conexión con Supabase sin confirmar"
          }
          className={clsx(
            "mb-3 flex items-center gap-2 rounded-lg border border-line bg-carbon-900 p-2.5",
            collapsed && "justify-center",
          )}
        >
          <span
            className={clsx(
              "h-2 w-2 shrink-0 rounded-full",
              connection.isSuccess ? "bg-positive-500" : "bg-pending-500",
            )}
          />
          {!collapsed && (
            <div className="text-[11px]">
              <p
                className={
                  connection.isSuccess
                    ? "text-positive-700"
                    : "text-pending-500"
                }
              >
                {connection.isSuccess
                  ? "Sistema operativo"
                  : "Revisar conexión"}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-500">
                {connection.isSuccess
                  ? "Supabase conectado"
                  : connection.isPending
                    ? "Comprobando Supabase…"
                    : "Sin conexión confirmada"}
              </p>
            </div>
          )}
        </div>
        <div
          className={clsx("flex items-center gap-2", collapsed && "flex-col")}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-carbon-800 text-xs text-gold-400">
            {profile?.full_name.slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {profile?.full_name}
              </p>
              <p className="text-[10px] text-ink-500">
                {isAdmin ? "Administrador" : "Empleado"}
              </p>
            </div>
          )}
          <button
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            onClick={() => void signOut()}
            className="rounded-md p-2 text-ink-500 hover:bg-carbon-800"
          >
            <LogOut size={16} />
          </button>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            title={collapsed ? "Expandir navegación" : "Contraer navegación"}
            aria-label={
              collapsed ? "Expandir navegación" : "Contraer navegación"
            }
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg p-1 text-[10px] text-ink-500 hover:bg-carbon-800"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <>
                <PanelLeftClose size={16} />
                Contraer menú
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
