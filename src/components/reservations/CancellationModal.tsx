import { useState } from "react";
import { useCancelReservation } from "@/features/reservations/hooks";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Select, Textarea } from "@/components/ui/Field";
export function CancellationModal({
  open,
  id,
  folio,
  onClose,
}: {
  open: boolean;
  id: string;
  folio: string;
  onClose: () => void;
}) {
  const cancel = useCancelReservation();
  const [reason, setReason] = useState("Cliente canceló");
  const [comment, setComment] = useState("");
  return (
    <Modal
      open={open}
      title={`Cancelar reservación · ${folio}`}
      onClose={() => {
        if (!cancel.isPending) onClose();
      }}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={cancel.isPending}
            onClick={onClose}
          >
            Volver
          </Button>
          <Button
            variant="danger"
            loading={cancel.isPending}
            disabled={reason === "Otro" && !comment.trim()}
            onClick={() =>
              cancel.mutate(
                {
                  id,
                  note: [reason, comment.trim()].filter(Boolean).join(" · "),
                },
                { onSuccess: onClose },
              )
            }
          >
            Cancelar reservación
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-500">
          El motivo quedará registrado en el historial del servicio.
        </p>
        <FieldWrapper label="Motivo" htmlFor={`cancel-reason-${id}`}>
          <Select
            id={`cancel-reason-${id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {[
              "Cliente canceló",
              "Vuelo cancelado",
              "No show",
              "Error de reservación",
              "Otro",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper
          label="Comentario"
          htmlFor={`cancel-comment-${id}`}
          hint={reason === "Otro" ? "Describe el motivo" : "Opcional"}
        >
          <Textarea
            id={`cancel-comment-${id}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </FieldWrapper>
        {cancel.isError && (
          <p role="alert" className="text-sm text-danger-500">
            {cancel.error instanceof Error
              ? cancel.error.message
              : "No se pudo cancelar."}
          </p>
        )}
      </div>
    </Modal>
  );
}
