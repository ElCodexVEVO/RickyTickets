import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AdminRoute } from "@/routes/RoleRoute";
import { FullScreenLoader } from "@/components/ui/FullScreenLoader";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";

const PublicTicketPage = lazy(() => import("@/pages/PublicTicketPage"));

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AgendaPage = lazy(() => import("@/pages/AgendaPage"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const CreateTicketPage = lazy(() => import("@/pages/CreateTicketPage"));
const ReservationsPage = lazy(() => import("@/pages/ReservationsPage"));
const ReservationDetailPage = lazy(
  () => import("@/pages/ReservationDetailPage"),
);
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("@/pages/CustomerDetailPage"));
const VehiclesPage = lazy(() => import("@/pages/VehiclesPage"));
const DriversPage = lazy(() => import("@/pages/DriversPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export function AppRouter() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<SignupPage />} />
        <Route path="/verificar/:id" element={<PublicTicketPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="ticket/nuevo" element={<CreateTicketPage />} />
            <Route path="reservaciones" element={<ReservationsPage />} />
            <Route
              path="reservaciones/:id"
              element={<ReservationDetailPage />}
            />
            <Route path="clientes" element={<CustomersPage />} />
            <Route path="clientes/:id" element={<CustomerDetailPage />} />
            <Route path="vehiculos" element={<VehiclesPage />} />
            <Route path="conductores" element={<DriversPage />} />

            <Route element={<AdminRoute />}>
              <Route path="actividad" element={<ActivityPage />} />
              <Route path="reportes" element={<ReportsPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="configuracion" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
