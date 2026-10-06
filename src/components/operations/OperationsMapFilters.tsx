import { useId } from "react";
import type {
  MapFilters,
  MapStateFilter,
  MapTimeFilter,
} from "@/lib/operationsMap";
import { operationDate } from "@/lib/operations";

const states: [MapStateFilter, string][] = [
  ["all", "Todos"],
  ["upcoming", "Por iniciar"],
  ["en_route", "En camino"],
  ["in_service", "En servicio"],
  ["pending", "Por confirmar"],
];
const periods: [MapTimeFilter, string][] = [
  ["today", "Hoy"],
  ["next2h", "Próximas 2 h"],
  ["day", "Todo el día"],
];
export function OperationsMapFilters({
  value,
  onChange,
  now,
}: {
  value: MapFilters;
  onChange: (value: MapFilters) => void;
  now: Date;
}) {
  const periodId = useId();
  const dateId = useId();
  return (
    <div className="operations-filters">
      <div
        role="group"
        aria-label="Estado de los servicios"
        className="operations-state-filters"
      >
        {states.map(([state, label]) => (
          <button
            key={state}
            type="button"
            aria-pressed={value.state === state}
            onClick={() => onChange({ ...value, state })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="operations-period-filters">
        <label className="sr-only" htmlFor={periodId}>
          Periodo de servicios
        </label>
        <select
          id={periodId}
          value={value.period}
          onChange={(e) =>
            onChange({
              ...value,
              period: e.target.value as MapTimeFilter,
              date: operationDate(now),
            })
          }
        >
          {periods.map(([period, label]) => (
            <option key={period} value={period}>
              {label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={dateId}>
          Fecha de operaciones
        </label>
        <input
          id={dateId}
          type="date"
          value={value.date}
          onChange={(e) => {
            if (e.target.value)
              onChange({ ...value, date: e.target.value, period: "day" });
          }}
        />
      </div>
    </div>
  );
}
