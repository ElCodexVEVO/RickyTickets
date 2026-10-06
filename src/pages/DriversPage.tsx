import { useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldWrapper, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
} from "@/features/drivers/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { uploadFleetPhoto } from "@/features/vehicles/api";
import { useAuth } from "@/context/AuthContext";
import type { DriverRow, DriverStatus } from "@/types/database.types";
import { useReservations } from "@/features/reservations/hooks";
import { operationDate, operationClock, serviceLegs } from "@/lib/operations";
import { QueryState } from "@/components/ui/QueryState";

const STATUS_LABEL: Record<DriverStatus, string> = {
  available: "Disponible",
  on_service: "En servicio",
  off_duty: "Fuera de turno",
  inactive: "Inactivo",
};

const STATUS_TONE: Record<DriverStatus, string> = {
  available: "bg-positive-50 text-positive-700",
  on_service: "bg-gold-300/40 text-gold-700",
  off_duty: "bg-surface-700 text-ink-500",
  inactive: "bg-surface-700 text-ink-500",
};

const emptyForm = {
  full_name: "",
  phone: "",
  vehicle_id: "",
  status: "available" as DriverStatus,
  license_number: "",
  photo_url: null as string | null,
};

export default function DriversPage() {
  const { isAdmin } = useAuth();
  const { data: drivers, isLoading, isError } = useDrivers();
  const { data: vehicles } = useVehicles();
  const reservations = useReservations({});
  const legs = serviceLegs(reservations.data ?? []).filter(
    (l) => l.reservation.status !== "cancelled",
  );
  const today = legs.filter((l) => l.date === operationDate());
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DriverRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<DriverRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(driver: DriverRow) {
    setEditing(driver);
    setForm({
      full_name: driver.full_name,
      phone: driver.phone ?? "",
      vehicle_id: driver.vehicle_id ?? "",
      status: driver.status,
      license_number: driver.license_number ?? "",
      photo_url: driver.photo_url,
    });
    setModalOpen(true);
  }

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFleetPhoto(file, "drivers");
      setForm((f) => ({ ...f, photo_url: url }));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "No se pudo subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    setFormError(null);
    if (form.full_name.trim().length < 2) {
      setFormError("Escribe el nombre completo del conductor.");
      return;
    }
    const payload = {
      full_name: form.full_name,
      phone: form.phone || null,
      vehicle_id: form.vehicle_id || null,
      status: form.status,
      license_number: form.license_number || null,
      photo_url: form.photo_url,
    };
    if (editing) {
      updateDriver.mutate(
        { id: editing.id, input: payload },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createDriver.mutate(payload, { onSuccess: () => setModalOpen(false) });
    }
  }

  function vehicleLabel(vehicleId: string | null) {
    const v = vehicles?.find((veh) => veh.id === vehicleId);
    return v ? `${v.brand} ${v.model}` : "Sin asignar";
  }

  return (
    <div>
      <PageHeader
        title="Conductores"
        subtitle="Equipo de conductores de Danny Transfers."
        actions={
          isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Agregar conductor
            </Button>
          )
        }
      />
      {isLoading && <QueryState loading />}
      <QueryState
        error={createDriver.error || updateDriver.error || deleteDriver.error}
      />

      {isError ? (
        <EmptyState
          icon={UserRound}
          title="No se pudo conectar a Supabase"
          description="Configura tus credenciales en .env.local."
        />
      ) : !isLoading && (drivers?.length ?? 0) === 0 ? (
        <EmptyState icon={UserRound} title="Sin conductores registrados" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers?.map((d) => (
            <Card key={d.id} className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-800">
                {d.photo_url ? (
                  <img
                    src={d.photo_url}
                    alt={d.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-6 w-6 text-ink-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold text-ink-900">
                  {d.full_name}
                </p>
                <p className="truncate text-xs text-ink-500">
                  {vehicleLabel(d.vehicle_id)}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[d.status]}`}
                >
                  {d.status === "available" &&
                  today.some(
                    (l) =>
                      l.reservation.driver_id === d.id &&
                      l.reservation.status !== "completed",
                  )
                    ? "Asignado"
                    : STATUS_LABEL[d.status]}
                </span>
                <p className="mt-3 text-xs text-gold-300">
                  Servicios hoy:{" "}
                  {reservations.isPending || reservations.isError
                    ? "—"
                    : today.filter((l) => l.reservation.driver_id === d.id)
                        .length}
                </p>
                <p className="mt-1 text-[11px] text-ink-500">
                  Próximo:{" "}
                  {(() => {
                    const next = legs.find(
                      (l) =>
                        l.reservation.driver_id === d.id &&
                        l.time &&
                        l.reservation.status !== "completed" &&
                        (l.date > operationDate() ||
                          (l.date === operationDate() &&
                            l.time.slice(0, 5) >= operationClock())),
                    );
                    return next
                      ? `${next.date} · ${next.time?.slice(0, 5)} · ${next.reservation.folio}`
                      : "Sin servicio programado";
                  })()}
                </p>
                {d.license_number && (
                  <p className="mt-1 text-[11px] text-ink-500">
                    Licencia: {d.license_number}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    onClick={() => openEdit(d)}
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-surface-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setToDelete(d)}
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-surface-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Editar conductor" : "Agregar conductor"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createDriver.isPending || updateDriver.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p role="alert" className="text-sm text-danger-500">
              {formError}
            </p>
          )}
          <QueryState error={createDriver.error || updateDriver.error} />
          <label className="group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-surface-950 text-ink-500 transition-colors hover:border-gold-400 hover:bg-surface-800">
            {form.photo_url ? (
              <>
                <img
                  src={form.photo_url}
                  className="h-20 w-20 rounded-full object-cover shadow ring-4 ring-white"
                  alt=""
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-carbon-950/0 opacity-0 transition-opacity group-hover:bg-carbon-950/50 group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-cream-50">
                    <ImagePlus className="h-4 w-4" />
                    Cambiar foto
                  </span>
                </div>
              </>
            ) : (
              <>
                <UserRound className="h-7 w-7" />
                <span className="text-sm font-medium">
                  {uploading ? "Subiendo..." : "Subir foto del conductor"}
                </span>
                <span className="text-xs text-ink-400">PNG o JPG</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper
              label="Nombre completo"
              htmlFor="dr_name"
              required
              className="col-span-2"
            >
              <Input
                id="dr_name"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
              />
            </FieldWrapper>
            <FieldWrapper label="Teléfono" htmlFor="dr_phone">
              <Input
                id="dr_phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FieldWrapper>
            <FieldWrapper label="Licencia" htmlFor="dr_license">
              <Input
                id="dr_license"
                value={form.license_number}
                onChange={(e) =>
                  setForm({ ...form, license_number: e.target.value })
                }
              />
            </FieldWrapper>
            <FieldWrapper label="Vehículo asignado" htmlFor="dr_vehicle">
              <Select
                id="dr_vehicle"
                value={form.vehicle_id}
                onChange={(e) =>
                  setForm({ ...form, vehicle_id: e.target.value })
                }
              >
                <option value="">Sin asignar</option>
                {vehicles?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} · {v.plate}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Estado" htmlFor="dr_status">
              <Select
                id="dr_status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as DriverStatus })
                }
              >
                <option value="available">Disponible</option>
                <option value="on_service">En servicio</option>
                <option value="off_duty">Fuera de turno</option>
                <option value="inactive">Inactivo</option>
              </Select>
            </FieldWrapper>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={`Eliminar ${toDelete?.full_name}`}
        description="El conductor dejará de aparecer en el catálogo activo."
        danger
        loading={deleteDriver.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          deleteDriver.mutate(toDelete.id, {
            onSuccess: () => setToDelete(null),
          })
        }
      />
    </div>
  );
}
