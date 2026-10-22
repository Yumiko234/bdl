import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NewsManagement } from "./NewsManagement";
import { EventManagement } from "./EventManagement";
import { CalendarManagement } from "./CalendarManagement";
import { DocumentManagement } from "./DocumentManagement";
import { OfficialJournalManagement } from "./OfficialJournalManagement";
import { Newspaper } from "lucide-react";

interface Props { isPresident: boolean; primaryRole: string; }

export const ContentCentral = ({ isPresident, primaryRole }: Props) => {
  const showDocuments = primaryRole !== "vie_scolaire";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Newspaper className="h-6 w-6" />
        <h2 className="text-xl font-bold">Contenu</h2>
      </div>
      <Tabs defaultValue="news">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="news">Actualités</TabsTrigger>
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          {showDocuments && <TabsTrigger value="documents">Documents</TabsTrigger>}
          <TabsTrigger value="journal">Journal Officiel</TabsTrigger>
        </TabsList>
        <TabsContent value="news"     className="mt-4"><NewsManagement isPresident={isPresident} /></TabsContent>
        <TabsContent value="events"   className="mt-4"><EventManagement isPresident={isPresident} /></TabsContent>
        <TabsContent value="calendar" className="mt-4"><CalendarManagement /></TabsContent>
        {showDocuments && <TabsContent value="documents" className="mt-4"><DocumentManagement /></TabsContent>}
        <TabsContent value="journal"  className="mt-4"><OfficialJournalManagement /></TabsContent>
      </Tabs>
    </div>
  );
};
