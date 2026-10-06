import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Textarea } from "@/components/ui/Field";
import {
  useCompanySettings,
  useUpdateSetting,
} from "@/features/settings/hooks";
import { QueryState } from "@/components/ui/QueryState";
import { CatalogManager } from "@/components/ui/CatalogManager";

export default function SettingsPage() {
  const { data: settings, isLoading, error } = useCompanySettings();
  const updateSetting = useUpdateSetting();

  const [company, setCompany] = useState({
    name: "",
    tagline: "",
    phone: "",
    instagram: "",
    whatsapp: "",
  });
  const [meetingPoints, setMeetingPoints] = useState({
    tulum_airport: "",
    cancun_airport: "",
  });
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (!settings) return;
    setCompany(settings.companyInfo);
    setMeetingPoints(settings.meetingPoints);
    setTerms(settings.ticketTerms.text);
  }, [settings]);

  if (isLoading) return <QueryState loading />;
  if (error) return <QueryState error={error} />;

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Datos de la empresa, meeting points y términos del ticket."
      />
      <QueryState error={updateSetting.error} />
      {updateSetting.isSuccess && (
        <p role="status" className="mb-4 text-sm text-positive-700">
          Configuración guardada.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-900">
              Datos de la empresa
            </h2>
            <Button
              size="sm"
              loading={updateSetting.isPending}
              onClick={() =>
                updateSetting.mutate({ key: "company_info", value: company })
              }
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </div>
          <div className="space-y-4">
            <FieldWrapper label="Nombre" htmlFor="c_name">
              <Input
                id="c_name"
                value={company.name}
                onChange={(e) =>
                  setCompany({ ...company, name: e.target.value })
                }
              />
            </FieldWrapper>
            <FieldWrapper label="Tagline" htmlFor="c_tagline">
              <Input
                id="c_tagline"
                value={company.tagline}
                onChange={(e) =>
                  setCompany({ ...company, tagline: e.target.value })
                }
              />
            </FieldWrapper>
            <FieldWrapper label="Teléfono" htmlFor="c_phone">
              <Input
                id="c_phone"
                value={company.phone}
                onChange={(e) =>
                  setCompany({ ...company, phone: e.target.value })
                }
              />
            </FieldWrapper>
            <FieldWrapper label="Instagram" htmlFor="c_ig">
              <Input
                id="c_ig"
                value={company.instagram}
                onChange={(e) =>
                  setCompany({ ...company, instagram: e.target.value })
                }
              />
            </FieldWrapper>
            <FieldWrapper label="WhatsApp" htmlFor="c_wa">
              <Input
                id="c_wa"
                value={company.whatsapp}
                onChange={(e) =>
                  setCompany({ ...company, whatsapp: e.target.value })
                }
              />
            </FieldWrapper>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-900">
              Meeting points
            </h2>
            <Button
              size="sm"
              loading={updateSetting.isPending}
              onClick={() =>
                updateSetting.mutate({
                  key: "meeting_points",
                  value: meetingPoints,
                })
              }
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </div>
          <div className="space-y-4">
            <FieldWrapper label="Tulum Airport" htmlFor="m_tulum">
              <Textarea
                id="m_tulum"
                value={meetingPoints.tulum_airport}
                onChange={(e) =>
                  setMeetingPoints({
                    ...meetingPoints,
                    tulum_airport: e.target.value,
                  })
                }
              />
            </FieldWrapper>
            <FieldWrapper label="Cancún Airport" htmlFor="m_cancun">
              <Textarea
                id="m_cancun"
                value={meetingPoints.cancun_airport}
                onChange={(e) =>
                  setMeetingPoints({
                    ...meetingPoints,
                    cancun_airport: e.target.value,
                  })
                }
              />
            </FieldWrapper>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-900">
              Términos del ticket
            </h2>
            <Button
              size="sm"
              loading={updateSetting.isPending}
              onClick={() =>
                updateSetting.mutate({
                  key: "ticket_terms",
                  value: { text: terms },
                })
              }
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </div>
          <FieldWrapper
            label="Texto que aparece al pie del PDF"
            htmlFor="terms"
          >
            <Textarea
              id="terms"
              className="h-32"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </FieldWrapper>
        </Card>
      </div>
      <CatalogManager />
    </div>
  );
}
