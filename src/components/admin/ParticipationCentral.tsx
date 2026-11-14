import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrutinManagement } from "./ScrutinManagement";
import { SurveyManagement } from "./SurveyManagement";
import { SuiviActionsManagement } from "./AdminSuiviActions";
import { CertificateManagement } from "./CertificatManagement";
import { Vote } from "lucide-react";

const VALID_TABS = ["scrutin", "surveys", "actions", "certificat"];

export const ParticipationCentral = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [tab, setTab] = useState(VALID_TABS.includes(tabFromUrl ?? "") ? tabFromUrl! : "scrutin");

  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== tab) setTab(tabFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="h-6 w-6" />
        <h2 className="text-xl font-bold">Participation</h2>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scrutin">Scrutins</TabsTrigger>
          <TabsTrigger value="surveys">Sondages</TabsTrigger>
          <TabsTrigger value="actions">Suivi Actions</TabsTrigger>
          <TabsTrigger value="certificat">Certificats</TabsTrigger>
        </TabsList>
        <TabsContent value="scrutin"    className="mt-4"><ScrutinManagement /></TabsContent>
        <TabsContent value="surveys"    className="mt-4"><SurveyManagement /></TabsContent>
        <TabsContent value="actions"    className="mt-4"><SuiviActionsManagement /></TabsContent>
        <TabsContent value="certificat" className="mt-4"><CertificateManagement /></TabsContent>
      </Tabs>
    </div>
  );
};
