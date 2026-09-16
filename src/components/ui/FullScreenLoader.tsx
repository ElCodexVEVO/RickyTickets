import { Loader2 } from "lucide-react";

export function FullScreenLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-carbon-950">
      <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
    </div>
  );
}
