import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (!loading) onCancel();
      }}
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Volver
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <AlertTriangle className="mb-3 h-6 w-6 text-pending-500" />
      <p className="text-sm text-ink-500">{description}</p>
    </Modal>
  );
}
