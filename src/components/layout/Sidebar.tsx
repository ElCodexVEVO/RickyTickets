import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  CalendarRange,
  Users,
  Car,
  IdCard,
  BarChart3,
  Settings,
  UserCog,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import logoUrl from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/ticket/nuevo", label: "Crear Ticket", icon: FilePlus2 },
  { to: "/reservaciones", label: "Reservaciones", icon: CalendarRange },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/vehiculos", label: "Vehículos", icon: Car },
  { to: "/conductores", label: "Conductores", icon: IdCard },
  { to: "/reportes", label: "Reportes", icon: BarChart3, adminOnly: true },
  { to: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
  { to: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <div className="flex h-full w-full flex-col bg-carbon-950 text-cream-50">
      <div className="flex items-center gap-3 px-5 py-6">
        <img src={logoUrl} alt="Danny Transfers" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold tracking-wide text-cream-50">Danny Transfers</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-300">RickyTickets</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-none">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gold-500 text-carbon-950"
                    : "text-cream-100/80 hover:bg-carbon-800 hover:text-cream-50",
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-carbon-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-carbon-800 text-xs font-semibold text-gold-400">
            {(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cream-50">{profile?.full_name ?? "Cargando..."}</p>
            <p className="text-xs text-ink-300">{isAdmin ? "Administrador" : "Empleado"}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-3 w-full rounded-lg border border-carbon-700 py-2 text-xs font-medium text-ink-300 transition-colors hover:border-gold-500/50 hover:text-gold-400"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
