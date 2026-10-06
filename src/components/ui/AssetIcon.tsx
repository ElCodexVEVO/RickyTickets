import { clsx } from "clsx";

// Icono SVG de public/assets dibujado con mask: toma el color del texto actual,
// así respeta la paleta (dorado activo, gris inactivo) sin editar los archivos.
export function AssetIcon({
  src,
  size = 16,
  className,
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx("inline-block shrink-0 bg-current", className)}
      style={{
        width: size,
        height: size,
        mask: `url("${src}") center / contain no-repeat`,
        WebkitMask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}
