import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EstablishmentManagement } from "./EstablishmentManagement";
import { ContactManagement } from "./ContactManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPrimaryRole } from "@/lib/roles";
import { Building2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const PresidentMessageSection = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [presidentUserId, setPresidentUserId] = useState("");
  const [options, setOptions] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (rolesData || []).map((r: any) => r.role as string);
      const primary = getPrimaryRole(roles);
      setCanEdit(["president", "presidente", "administrator"].includes(primary));

      const { data: msg } = await (supabase.from("president_message") as any).select("content, president_user_id").single();
      if (msg) { setMessage(msg.content ?? ""); if (msg.president_user_id) setPresidentUserId(msg.president_user_id); }

      const { data: opts } = await supabase.from("user_roles").select("user_id, role, profiles(full_name)").in("role", ["president", "presidente"]);
      if (opts) setOptions(opts.map((r: any) => ({ id: r.user_id, full_name: r.profiles?.full_name ?? r.user_id, role: r.role })));
    })();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from("president_message").select("id").maybeSingle();
    let error;
    if (existing?.id) {
      ({ error } = await supabase.from("president_message")
        .update({ content: message, updated_by: user?.id, president_user_id: presidentUserId || null } as any)
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("president_message")
        .insert({ content: message, updated_by: user?.id, president_user_id: presidentUserId || null } as any));
      if ((error as any)?.code === "23505") {
        const { data: retry } = await supabase.from("president_message").select("id").maybeSingle();
        if (retry?.id) ({ error } = await supabase.from("president_message")
          .update({ content: message, updated_by: user?.id, president_user_id: presidentUserId || null } as any)
          .eq("id", retry.id));
      }
    }
    if (error) toast.error("Erreur de sauvegarde"); else toast.success("Message mis à jour");
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Message de la Présidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Président(e) affiché(e)</Label>
          <Select value={presidentUserId} onValueChange={setPresidentUserId} disabled={!canEdit}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un(e) président(e)" /></SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.full_name} - {opt.role === "presidente" ? "Présidente" : "Président"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <RichTextEditor value={message} onChange={setMessage} />
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Mettre à jour le message"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const SiteCentral = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Building2 className="h-6 w-6" />
      <h2 className="text-xl font-bold">Site</h2>
    </div>
    <Tabs defaultValue="president">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="president">Message Présidence</TabsTrigger>
        <TabsTrigger value="establishment">Établissement</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
      </TabsList>
      <TabsContent value="president"     className="mt-4"><PresidentMessageSection /></TabsContent>
      <TabsContent value="establishment" className="mt-4"><EstablishmentManagement /></TabsContent>
      <TabsContent value="contact"       className="mt-4"><ContactManagement /></TabsContent>
    </Tabs>
  </div>
);
