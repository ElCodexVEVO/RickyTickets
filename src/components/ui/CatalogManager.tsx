import { useState } from "react";
import { useCatalogs, useSaveCatalog } from "@/features/settings/catalogs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Select } from "@/components/ui/Field";
import { QueryState } from "@/components/ui/QueryState";
import type {
  CatalogKind,
  ServiceCatalogItemRow,
} from "@/types/database.types";
const labels: Record<CatalogKind, string> = {
  service_type: "Servicios / tipos de servicio",
  location: "Ubicaciones",
  payment_method: "Métodos de pago",
};
const defaults = {
  kind: "service_type" as CatalogKind,
  label: "",
  code: "",
  sort_order: 0,
  active: true,
};
export function CatalogManager() {
  const query = useCatalogs();
  const save = useSaveCatalog();
  const [editing, setEditing] = useState<ServiceCatalogItemRow | null>(null);
  const [form, setForm] = useState(defaults);
  const edit = (item: ServiceCatalogItemRow) => {
    setEditing(item);
    setForm({
      kind: item.kind,
      label: item.label,
      code: item.code ?? "",
      sort_order: item.sort_order,
      active: item.active,
    });
  };
  return (
    <Card className="mt-6 p-5">
      <h2 className="text-base font-semibold">Catálogos operativos</h2>
      <p className="mb-4 mt-1 text-xs text-ink-500">
        Servicios, ubicaciones y métodos de pago compartidos con los
        formularios. Desactiva entradas para conservar las referencias
        históricas.
      </p>
      <QueryState loading={query.isPending} error={query.error || save.error} />
      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(labels) as CatalogKind[]).map((kind) => (
          <div key={kind}>
            <h3 className="mb-2 text-xs font-semibold text-gold-300">
              {labels[kind]}
            </h3>
            <div className="space-y-1">
              {query.data
                ?.filter((c) => c.kind === kind)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => edit(c)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-line p-2.5 text-left text-xs hover:bg-carbon-800"
                  >
                    <span>{c.label}</span>
                    <span
                      className={
                        c.active ? "text-positive-700" : "text-ink-500"
                      }
                    >
                      {c.active ? "Activo" : "Inactivo"}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      <form
        className="mt-5 space-y-4 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.label.trim())
            save.mutate(
              {
                ...form,
                label: form.label.trim(),
                code: form.code.trim() || null,
                id: editing?.id,
              },
              {
                onSuccess: () => {
                  setEditing(null);
                  setForm(defaults);
                },
              },
            );
        }}
      >
        <h3 className="text-sm font-semibold">
          {editing ? "Editar entrada" : "Nueva entrada"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FieldWrapper label="Catálogo" htmlFor="catalog-kind">
            <Select
              id="catalog-kind"
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as CatalogKind })
              }
            >
              {(Object.keys(labels) as CatalogKind[]).map((k) => (
                <option key={k} value={k}>
                  {labels[k]}
                </option>
              ))}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Nombre" htmlFor="catalog-label" required>
            <Input
              id="catalog-label"
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </FieldWrapper>
          <FieldWrapper label="Código" htmlFor="catalog-code">
            <Input
              id="catalog-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </FieldWrapper>
          <FieldWrapper label="Orden" htmlFor="catalog-order">
            <Input
              id="catalog-order"
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: Number(e.target.value) })
              }
            />
          </FieldWrapper>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-gold-500"
            />
            Activo
          </label>
          <Button size="sm" type="submit" loading={save.isPending}>
            Guardar entrada
          </Button>
          {editing && (
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(defaults);
              }}
            >
              Nueva entrada
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
