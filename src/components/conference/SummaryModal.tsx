import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionSummary } from "./signals";

export default function SummaryModal({
  summary, title, ended, onClose,
}: {
  summary: SessionSummary;
  title: string;
  /** true si la conférence a été terminée pour tout le monde */
  ended: boolean;
  onClose: () => void;
}) {
  const items = [
    { label: "Durée", value: summary.duration },
    { label: "Participants max", value: String(summary.maxParticipants) },
    { label: "Messages", value: String(summary.messageCount) },
    {
      label: "Début",
      value: summary.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    },
  ];

  return (
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">📊 Récapitulatif</CardTitle>
          <CardDescription>
            {ended ? "Conférence terminée : " : "Vous avez quitté : "}
            <span className="font-medium">{title}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {items.map(({ label, value }) => (
              <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={onClose}>Fermer</Button>
        </CardContent>
      </Card>
    </div>
  );
}