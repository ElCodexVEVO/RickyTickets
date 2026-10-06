import { useState } from "react";
import { Car, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldWrapper, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from "@/features/vehicles/hooks";
import { uploadFleetPhoto } from "@/features/vehicles/api";
import { useAuth } from "@/context/AuthContext";
import type {
  VehicleRow,
  VehicleStatus,
  VehicleType,
} from "@/types/database.types";
import { useReservations } from "@/features/reservations/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { operationDate, serviceLegs } from "@/lib/operations";
import { QueryState } from "@/components/ui/QueryState";

const STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Disponible",
  in_service: "En servicio",
  maintenance: "Mantenimiento",
  inactive: "Fuera de operación",
};

const STATUS_TONE: Record<VehicleStatus, string> = {
  available: "bg-positive-50 text-positive-700",
  in_service: "bg-gold-300/40 text-gold-700",
  maintenance: "bg-pending-50 text-pending-500",
  inactive: "bg-surface-700 text-ink-500",
};

const emptyForm = {
  brand: "",
  model: "",
  plate: "",
  capacity: "4",
  type: "van" as VehicleType,
  status: "available" as VehicleStatus,
  photo_url: null as string | null,
};

export default function VehiclesPage() {
  const { isAdmin } = useAuth();
  const { data: vehicles, isLoading, isError } = useVehicles();
  const reservations = useReservations({});
  const drivers = useDrivers();
  const today = serviceLegs(reservations.data ?? []).filter(
    (l) => l.date === operationDate() && l.reservation.status !== "cancelled",
  );
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<VehicleRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(vehicle: VehicleRow) {
    setEditing(vehicle);
    setForm({
      brand: vehicle.brand,
      model: vehicle.model,
      plate: vehicle.plate,
      capacity: String(vehicle.capacity),
      type: vehicle.type,
      status: vehicle.status,
      photo_url: vehicle.photo_url,
    });
    setModalOpen(true);
  }

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFleetPhoto(file, "vehicles");
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
    if (
      !form.brand.trim() ||
      !form.model.trim() ||
      !form.plate.trim() ||
      !Number.isInteger(Number(form.capacity)) ||
      Number(form.capacity) < 1
    ) {
      setFormError(
        "Revisa marca, modelo, matrícula y capacidad (entero positivo).",
      );
      return;
    }
    const payload = {
      brand: form.brand,
      model: form.model,
      plate: form.plate,
      capacity: Number(form.capacity) || 1,
      type: form.type,
      status: form.status,
      photo_url: form.photo_url,
    };
    if (editing) {
      updateVehicle.mutate(
        { id: editing.id, input: payload },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createVehicle.mutate(payload, { onSuccess: () => setModalOpen(false) });
    }
  }

  return (
    <div>
      <PageHeader
        title="Vehículos"
        subtitle="Flota de Danny Transfers."
        actions={
          isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Agregar vehículo
            </Button>
          )
        }
      />
      {isLoading && <QueryState loading />}
      <QueryState
        error={
          createVehicle.error || updateVehicle.error || deleteVehicle.error
        }
      />

      {isError ? (
        <EmptyState
          icon={Car}
          title="No se pudo conectar a Supabase"
          description="Configura tus credenciales en .env.local."
        />
      ) : !isLoading && (vehicles?.length ?? 0) === 0 ? (
        <EmptyState icon={Car} title="Sin vehículos registrados" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles?.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className="flex h-32 items-center justify-center bg-surface-800">
                {v.photo_url ? (
                  <img
                    src={v.photo_url}
                    alt={`${v.brand} ${v.model}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Car className="h-10 w-10 text-ink-300" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-base font-semibold text-ink-900">
                      {v.brand} {v.model}
                    </p>
                    <p className="font-mono-tab text-xs text-ink-500">
                      {v.plate}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[v.status]}`}
                  >
                    {v.status === "available" &&
                    today.some(
                      (l) =>
                        l.reservation.vehicle_id === v.id &&
                        !["completed", "cancelled"].includes(
                          l.reservation.status,
                        ),
                    )
                      ? "Asignado"
                      : STATUS_LABEL[v.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {v.capacity} pasajeros · {v.type}
                </p>
                <p className="mt-3 text-xs text-ink-500">
                  Conductor:{" "}
                  {drivers.data
                    ?.filter((d) => d.vehicle_id === v.id)
                    .map((d) => d.full_name)
                    .join(", ") || "Sin asignar"}
                </p>
                <p className="mt-1 text-xs text-gold-300">
                  Servicios hoy:{" "}
                  {reservations.isPending || reservations.isError
                    ? "—"
                    : today.filter((l) => l.reservation.vehicle_id === v.id)
                        .length}
                </p>
                {isAdmin && (
                  <div className="mt-3 flex gap-2 border-t border-line pt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(v)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setToDelete(v)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Editar vehículo" : "Agregar vehículo"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createVehicle.isPending || updateVehicle.isPending}
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
          <QueryState error={createVehicle.error || updateVehicle.error} />
          <label className="group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed border-line bg-surface-950 text-ink-500 transition-colors hover:border-gold-400 hover:bg-surface-800">
            {form.photo_url && (
              <img
                src={form.photo_url}
                className="absolute inset-0 h-full w-full object-cover"
                alt=""
              />
            )}
            {form.photo_url ? (
              <div className="absolute inset-0 flex items-center justify-center bg-carbon-950/0 opacity-0 transition-opacity group-hover:bg-carbon-950/50 group-hover:opacity-100">
                <span className="flex items-center gap-1.5 text-sm font-medium text-cream-50">
                  <ImagePlus className="h-4 w-4" />
                  Cambiar foto
                </span>
              </div>
            ) : (
              <>
                <Car className="h-7 w-7" />
                <span className="text-sm font-medium">
                  {uploading ? "Subiendo..." : "Subir foto del vehículo"}
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
            <FieldWrapper label="Marca" htmlFor="v_brand" required>
              <Input
                id="v_brand"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </FieldWrapper>
            <FieldWrapper label="Modelo" htmlFor="v_model" required>
              <Input
                id="v_model"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </FieldWrapper>
            <FieldWrapper label="Matrícula" htmlFor="v_plate" required>
              <Input
                id="v_plate"
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
              />
            </FieldWrapper>
            <FieldWrapper label="Capacidad" htmlFor="v_capacity" required>
              <Input
                id="v_capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </FieldWrapper>
            <FieldWrapper label="Tipo" htmlFor="v_type">
              <Select
                id="v_type"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as VehicleType })
                }
              >
                <option value="van">Van</option>
                <option value="suv">SUV</option>
                <option value="sedan">Sedán</option>
                <option value="sprinter">Sprinter</option>
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Estado" htmlFor="v_status">
              <Select
                id="v_status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as VehicleStatus })
                }
              >
                <option value="available">Disponible</option>
                <option value="in_service">En servicio</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="inactive">Inactivo</option>
              </Select>
            </FieldWrapper>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={`Eliminar ${toDelete?.brand} ${toDelete?.model}`}
        description="El vehículo dejará de aparecer en el catálogo activo."
        danger
        loading={deleteVehicle.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          deleteVehicle.mutate(toDelete.id, {
            onSuccess: () => setToDelete(null),
          })
        }
      />
    </div>
  );
}
