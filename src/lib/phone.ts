import countries from "@/data/countries.json";

export interface PhoneCountry {
  country: string;
  iso: string;
  dial: string;
}

export const phoneCountries: PhoneCountry[] = countries.map(
  ({ country, iso, dial }) => ({ country, iso, dial }),
);
export const DEFAULT_PHONE_COUNTRY = "MX";

// El teléfono se guarda como un solo texto («+52 999 123 4567»). Un teléfono
// histórico sin prefijo se conserva tal cual (iso vacío) para que la búsqueda del
// cliente por teléfono siga encontrándolo al guardar.
export function splitPhone(
  value: string,
  preferredIso = DEFAULT_PHONE_COUNTRY,
) {
  const text = value.trim();
  if (!text.startsWith("+"))
    return { iso: text ? "" : preferredIso, local: text };
  const matches = phoneCountries
    .filter((c) => text.startsWith(c.dial))
    .sort((a, b) => b.dial.length - a.dial.length);
  if (!matches.length) return { iso: "", local: text };
  // +1 lo comparten Estados Unidos y Canadá: respeta la elección actual.
  const match =
    matches.find((c) => c.iso === preferredIso && c.dial === matches[0].dial) ??
    matches[0];
  return { iso: match.iso, local: text.slice(match.dial.length).trim() };
}

export function joinPhone(iso: string, local: string) {
  const number = local.trim();
  const country = phoneCountries.find((c) => c.iso === iso);
  if (!country || !number || number.startsWith("+")) return number;
  return `${country.dial} ${number}`;
}
