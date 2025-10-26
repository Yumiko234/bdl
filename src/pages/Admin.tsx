import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, MessageSquare, FileText } from "lucide-react";
import { UserManagement } from "@/components/admin/UserManagement";
import { NewsManagement } from "@/components/admin/NewsManagement";
import { DocumentManagement } from "@/components/admin/DocumentManagement";
import { EventManagement } from "@/components/admin/EventManagement";
import { BDLMembersManagement } from "@/components/admin/BDLMembersManagement";
import { OfficialJournalManagement } from "@/components/admin/OfficialJournalManagement";
import { EstablishmentManagement } from "@/components/admin/EstablishmentManagement";
import { ContactManagement } from "@/components/admin/ContactManagement";
import { BDLContentManagement } from "@/components/admin/BDLContentManagement";
import { FooterManagement } from "@/components/admin/FooterManagement";
import { RichTextEditor } from "@/components/RichTextEditor";

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isPresident, setIsPresident] = useState(false);
  const [isVicePresident, setIsVicePresident] = useState(false);
  const [isBDLStaff, setIsBDLStaff] = useState(false);
  const [presidentMessage, setPresidentMessage] = useState("");
  const [audienceRequests, setAudienceRequests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkRoles();
      loadPresidentMessage();
      loadAudienceRequests();
    }
  }, [user]);

  const checkRoles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (data) {
      const roles = data.map(r => r.role);
      setIsPresident(roles.includes('president' as any));
      setIsVicePresident(roles.includes('vice_president' as any));
      setIsBDLStaff(roles.some((r: any) => ['president', 'vice_president', 'secretary_general', 'communication_manager', 'bdl_member'].includes(r)));
    }
  };

  const loadPresidentMessage = async () => {
    const { data, error } = await supabase
      .from('president_message')
      .select('content')
      .single();

    if (data) {
      setPresidentMessage(data.content);
    }
  };

  const loadAudienceRequests = async () => {
    const { data, error } = await supabase
      .from('audience_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setAudienceRequests(data);
    }
  };

  const handleSaveMessage = async () => {
    if (!isPresident) return;

    setSaving(true);
    const { error } = await supabase
      .from('president_message')
      .update({ content: presidentMessage, updated_by: user?.id })
      .eq('id', (await supabase.from('president_message').select('id').single()).data?.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Message mis à jour avec succès");
    }
    setSaving(false);
  };

  const handleUpdateRequestStatus = async (requestId: string, status: string, reviewMessage?: string) => {
    if (!isPresident) return;

    const { error } = await supabase
      .from('audience_requests')
      .update({ 
        status, 
        review_message: reviewMessage,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Demande mise à jour");
      loadAudienceRequests();
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!isBDLStaff) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl font-bold mb-2">Accès Refusé</h2>
              <p className="text-muted-foreground">
                Cette section est réservée aux membres du Bureau des Lycéens.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <Shield className="h-20 w-20 mx-auto" />
              <h1 className="text-5xl font-bold">Administration BDL</h1>
              <p className="text-xl">Gestion du site et des demandes</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <Tabs defaultValue="audience" className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-11">
                <TabsTrigger value="audience">Demandes</TabsTrigger>
                {isPresident && <TabsTrigger value="message">Message</TabsTrigger>}
                <TabsTrigger value="members">Membres</TabsTrigger>
                <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                <TabsTrigger value="news">Articles</TabsTrigger>
                <TabsTrigger value="events">Événements</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="journal">Journal</TabsTrigger>
                {(isPresident || isVicePresident) && (
                  <TabsTrigger value="establishment">Établissement</TabsTrigger>
                )}
                {(isPresident || isVicePresident || isBDLStaff) && (
                  <TabsTrigger value="bdl-content">Contenu BDL</TabsTrigger>
                )}
                {(isPresident || isVicePresident) && (
                  <TabsTrigger value="footer">Footer</TabsTrigger>
                )}
                {isBDLStaff && <TabsTrigger value="contact">Contact</TabsTrigger>}
              </TabsList>

              <TabsContent value="audience">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-6 w-6" />
                      Demandes d'Audience ({audienceRequests.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {audienceRequests.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Aucune demande d'audience pour le moment
                      </p>
                    ) : (
                      audienceRequests.map((request) => (
                        <Card key={request.id} className="bg-muted/30">
                          <CardContent className="p-6 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-lg">{request.subject}</h3>
                                  <Badge variant={
                                    request.status === 'pending' ? 'default' : 
                                    request.status === 'approved' ? 'secondary' : 
                                    'destructive'
                                  }>
                                    {request.status === 'pending' ? 'En attente' : 
                                     request.status === 'approved' ? 'Approuvée' : 
                                     'Refusée'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  De: {request.requester_name} ({request.requester_email})
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Type: {request.request_type}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Date: {new Date(request.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm">{request.message}</p>
                            
                            {isPresident && request.status === 'pending' && (
                              <div className="flex gap-2 pt-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleUpdateRequestStatus(request.id, 'approved')}
                                >
                                  Approuver
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleUpdateRequestStatus(request.id, 'rejected')}
                                >
                                  Refuser
                                </Button>
                              </div>
                            )}

                            {request.review_message && (
                              <div className="mt-3 p-3 bg-muted rounded-md">
                                <p className="text-sm font-medium">Réponse:</p>
                                <p className="text-sm">{request.review_message}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {isPresident && (
                <TabsContent value="message">
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Message du Président
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RichTextEditor
                        value={presidentMessage}
                        onChange={setPresidentMessage}
                        placeholder="Message du président..."
                      />
                      <Button onClick={handleSaveMessage} disabled={saving}>
                        {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {(isPresident || isVicePresident) && (
                <TabsContent value="members">
                  <BDLMembersManagement />
                </TabsContent>
              )}

              <TabsContent value="users">
                <UserManagement />
              </TabsContent>

              <TabsContent value="news">
                <NewsManagement isPresident={isPresident} />
              </TabsContent>

              <TabsContent value="events">
                <EventManagement isPresident={isPresident} />
              </TabsContent>

              <TabsContent value="documents">
                <DocumentManagement />
              </TabsContent>

            <TabsContent value="journal">
              <OfficialJournalManagement />
            </TabsContent>

            <TabsContent value="establishment">
              <EstablishmentManagement />
            </TabsContent>

            <TabsContent value="contact">
              <ContactManagement />
            </TabsContent>

            {(isPresident || isVicePresident || isBDLStaff) && (
              <TabsContent value="bdl-content">
                <BDLContentManagement />
              </TabsContent>
            )}

            {(isPresident || isVicePresident) && (
              <TabsContent value="footer">
                <FooterManagement />
              </TabsContent>
            )}
          </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
