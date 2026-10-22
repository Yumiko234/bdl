import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BannerManagement } from "./BannerManagement";
import { MaintenanceManagement } from "./MaintenanceManagement";
import { AdminManagement } from "./AdminManagament";
import { EventThemesManagement } from "./EventThemesManagement";
import { Wrench } from "lucide-react";

export const GestionCentral = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Wrench className="h-6 w-6" />
      <h2 className="text-xl font-bold">Gestion Système</h2>
    </div>
    <Tabs defaultValue="banner">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="banner">Bandeau</TabsTrigger>
        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        <TabsTrigger value="users">Gestion User</TabsTrigger>
        <TabsTrigger value="themes">Thèmes</TabsTrigger>
      </TabsList>
      <TabsContent value="banner"      className="mt-4"><BannerManagement /></TabsContent>
      <TabsContent value="maintenance" className="mt-4"><MaintenanceManagement /></TabsContent>
      <TabsContent value="users"       className="mt-4"><AdminManagement /></TabsContent>
      <TabsContent value="themes"      className="mt-4"><EventThemesManagement /></TabsContent>
    </Tabs>
  </div>
);
