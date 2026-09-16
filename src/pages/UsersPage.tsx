import { useState } from "react";
import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldWrapper, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfiles, useUpdateProfileAccess, useCreateEmployee } from "@/features/users/hooks";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/format";
import type { UserRole } from "@/types/database.types";

const emptyForm = { email: "", password: "", full_name: "", phone: "", role: "employee" as UserRole };

export default function UsersPage() {
  const { user } = useAuth();
  const { data: profiles, isLoading, isError } = useProfiles();
  const updateAccess = useUpdateProfileAccess();
  const createEmployee = useCreateEmployee();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate() {
    setFormError(null);
    try {
      await createEmployee.mutateAsync(form);
      setModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo crear el empleado.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Alta de empleados, roles y permisos."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo empleado
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {isError ? (
          <div className="p-6">
            <EmptyState icon={UserCog} title="No se pudo conectar a Supabase" description="Configura tus credenciales en .env.local." />
          </div>
        ) : !isLoading && (profiles?.length ?? 0) === 0 ? (
          <div className="p-6">
            <EmptyState icon={UserCog} title="Sin usuarios todavía" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Editar reservaciones</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {profiles?.map((p) => (
                  <tr key={p.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-carbon-950 text-xs font-semibold text-gold-400">
                          {initials(p.full_name)}
                        </div>
                        <div>
                          <p className="font-medium text-ink-900">{p.full_name}</p>
                          {p.id === user?.id && <p className="text-xs text-ink-500">Tú</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{p.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={p.role}
                        disabled={p.id === user?.id}
                        onChange={(e) => updateAccess.mutate({ id: p.id, patch: { role: e.target.value as UserRole } })}
                        className="h-8 w-32 text-xs"
                      >
                        <option value="employee">Empleado</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!!p.permissions?.can_edit_reservations}
                        disabled={p.role === "admin"}
                        onChange={(e) =>
                          updateAccess.mutate({
                            id: p.id,
                            patch: { permissions: { ...p.permissions, can_edit_reservations: e.target.checked } },
                          })
                        }
                        className="h-4 w-4 accent-gold-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateAccess.mutate({ id: p.id, patch: { active: !p.active } })}
                        disabled={p.id === user?.id}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          p.active ? "bg-positive-50 text-positive-700" : "bg-cream-200 text-ink-500"
                        }`}
                      >
                        {p.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title="Nuevo empleado"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={createEmployee.isPending}>
              Crear empleado
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FieldWrapper label="Nombre completo" htmlFor="u_name" required>
            <Input id="u_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </FieldWrapper>
          <FieldWrapper label="Correo" htmlFor="u_email" required>
            <Input id="u_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FieldWrapper>
          <FieldWrapper label="Contraseña temporal" htmlFor="u_password" required hint="El empleado podrá cambiarla después.">
            <Input id="u_password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Teléfono" htmlFor="u_phone">
              <Input id="u_phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FieldWrapper>
            <FieldWrapper label="Rol" htmlFor="u_role">
              <Select id="u_role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="employee">Empleado</option>
                <option value="admin">Admin</option>
              </Select>
            </FieldWrapper>
          </div>

          {formError && <p className="text-sm font-medium text-gold-700">{formError}</p>}

          <div className="flex items-center gap-2 rounded-lg bg-cream-50 p-3 text-xs text-ink-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-gold-600" />
            Esta acción se procesa en una Edge Function con permisos de servidor; la clave de administración nunca
            se expone en el navegador.
          </div>
        </div>
      </Modal>
    </div>
  );
}
