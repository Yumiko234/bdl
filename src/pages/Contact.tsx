import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ContactInfo {
  section_key: string;
  title: string;
  content: string;
}

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    type: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [contactInfos, setContactInfos] = useState<ContactInfo[]>([]);

  useEffect(() => {
    loadContactInfos();
  }, []);

  const loadContactInfos = async () => {
    const { data, error } = await supabase
      .from('contact_info')
      .select('section_key, title, content')
      .order('display_order');

    if (data) {
      setContactInfos(data);
    }
  };

  const getContactInfo = (key: string) => {
    return contactInfos.find(info => info.section_key === key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.type || !formData.message) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('audience_requests')
      .insert({
        requester_name: formData.name,
        requester_email: formData.email,
        subject: formData.subject,
        request_type: formData.type,
        message: formData.message,
        requester_id: user?.id || '00000000-0000-0000-0000-000000000000',
        status: 'pending'
      });

    setLoading(false);

    if (error) {
      toast.error("Erreur lors de l'envoi du message");
    } else {
      toast.success("Votre message a été envoyé avec succès. Le BDL vous répondra dans les plus brefs délais.");
      setFormData({ name: "", email: "", subject: "", type: "", message: "" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Contact & Remarques</h1>
              <p className="text-xl">Nous sommes à votre écoute</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="shadow-card">
                  <CardContent className="p-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Formulaire de Contact</h2>
                      <p className="text-muted-foreground">
                        Utilisez ce formulaire pour toute question, suggestion ou demande concernant 
                        le Bureau des Lycéens.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom et Prénom *</Label>
                        <Input
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Votre nom complet"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="votre.email@exemple.fr"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type">Type de demande *</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="question">Question générale</SelectItem>
                            <SelectItem value="suggestion">Suggestion</SelectItem>
                            <SelectItem value="club">Création de club</SelectItem>
                            <SelectItem value="audience">Demande d'audience</SelectItem>
                            <SelectItem value="complaint">Plainte ou médiation</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Objet *</Label>
                        <Input
                          id="subject"
                          required
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="Résumé de votre demande"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          required
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Détaillez votre demande..."
                          rows={6}
                        />
                      </div>

                      <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? "Envoi en cours..." : "Envoyer le message"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {getContactInfo('audience_info') && (
                  <Card className="shadow-card gradient-gold text-secondary">
                    <CardContent className="p-8 space-y-4">
                      <h3 className="text-2xl font-bold">{getContactInfo('audience_info')?.title}</h3>
                      <p className="whitespace-pre-line">
                        {getContactInfo('audience_info')?.content}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-card">
                  <CardContent className="p-8 space-y-4">
                    <h3 className="text-2xl font-bold">Informations de Contact</h3>
                    <div className="space-y-3 text-sm">
                      {getContactInfo('email') && (
                        <div>
                          <div className="font-semibold mb-1">{getContactInfo('email')?.title}</div>
                          <div className="text-muted-foreground whitespace-pre-line">
                            {getContactInfo('email')?.content}
                          </div>
                        </div>
                      )}
                      {getContactInfo('permanences') && (
                        <div>
                          <div className="font-semibold mb-1">{getContactInfo('permanences')?.title}</div>
                          <div className="text-muted-foreground whitespace-pre-line">
                            {getContactInfo('permanences')?.content}
                          </div>
                        </div>
                      )}
                      {getContactInfo('adresse') && (
                        <div>
                          <div className="font-semibold mb-1">{getContactInfo('adresse')?.title}</div>
                          <div className="text-muted-foreground whitespace-pre-line">
                            {getContactInfo('adresse')?.content}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {getContactInfo('response_time') && (
                  <Card className="shadow-card border-primary">
                    <CardContent className="p-6 space-y-3">
                      <h4 className="font-bold">{getContactInfo('response_time')?.title}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {getContactInfo('response_time')?.content}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
