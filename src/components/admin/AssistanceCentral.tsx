import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SupportManagement } from "./SupportManagement";
import { AdminConference } from "./AdminConference";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPrimaryRole, type RoleKey } from "@/lib/roles";
import { Headphones } from "lucide-react";
import { toast } from "sonner";

interface AudienceRequest {
  id: string; subject: string; message: string;
  requester_name: string; requester_email: string;
  status: "pending" | "approved" | "rejected";
}

const SupportSection = () => {
  const { user } = useAuth();
  const [primaryRole, setPrimaryRole] = useState<RoleKey>("student");
  const [userName, setUserName] = useState("Staff BDL");
  const [audienceRequests, setAudienceRequests] = useState<AudienceRequest[]>([]);
  const [isPresident, setIsPresident] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (rolesData || []).map((r: any) => r.role as string);
      const primary = getPrimaryRole(roles);
      setPrimaryRole(primary);
      setIsPresident(["president", "presidente", "administrator"].includes(primary));
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (profile) setUserName(profile.full_name);
    })();
    loadAudienceRequests();
  }, [user]);

  const loadAudienceRequests = async () => {
    const { data } = await supabase.from("audience_requests").select("*").order("created_at", { ascending: false });
    setAudienceRequests(data || []);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("audience_requests")
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Erreur"); else { toast.success("Mis à jour"); loadAudienceRequests(); }
  };

  return (
    <Tabs defaultValue="connected">
      <TabsList className="bg-muted p-1">
        <TabsTrigger value="connected">Support Connecté</TabsTrigger>
        <TabsTrigger value="public">Audiences & Public</TabsTrigger>
      </TabsList>
      <TabsContent value="connected" className="mt-4">
        <SupportManagement currentUserRole={primaryRole} currentUserId={user?.id ?? ""} currentUserName={userName} />
      </TabsContent>
      <TabsContent value="public" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liste des demandes ({audienceRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {audienceRequests.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm italic">Aucune demande pour le moment</p>
            ) : audienceRequests.map((req) => (
              <div key={req.id} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{req.subject}</h4>
                    <p className="text-xs text-muted-foreground">{req.requester_name} ({req.requester_email})</p>
                  </div>
                  <Badge variant={req.status === "pending" ? "default" : req.status === "approved" ? "secondary" : "destructive"}>
                    {req.status === "pending" ? "Attente" : req.status === "approved" ? "Traité" : "Refusé"}
                  </Badge>
                </div>
                <p className="text-sm bg-background p-3 rounded border italic">"{req.message}"</p>
                {isPresident && req.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => handleUpdateStatus(req.id, "approved")}>Accepter</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(req.id, "rejected")}>Refuser</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export const AssistanceCentral = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Headphones className="h-6 w-6" />
      <h2 className="text-xl font-bold">Assistance</h2>
    </div>
    <Tabs defaultValue="support">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="support">Support & Audiences</TabsTrigger>
        <TabsTrigger value="conference">Conférence</TabsTrigger>
      </TabsList>
      <TabsContent value="support"    className="mt-4"><SupportSection /></TabsContent>
      <TabsContent value="conference" className="mt-4"><AdminConference /></TabsContent>
    </Tabs>
  </div>
);
