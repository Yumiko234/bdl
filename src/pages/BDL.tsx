import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  roles: string[]; // ex: ['president','custom:Photographe']
  is_executive: boolean;
  display_order?: number | null;
}

const BDL = () => {
  const [executiveMembers, setExecutiveMembers] = useState<Member[]>([]);
  const [regularMembers, setRegularMembers] = useState<Member[]>([]);
  const [content, setContent] = useState<Record<string, string>>({});

  useEffect(() => {
    loadMembers();
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase.from("bdl_content").select("*");
      if (error) {
        console.error("Erreur chargement contenu:", error);
        toast.error("Erreur lors du chargement du contenu");
        return;
      }
      if (data) {
        const contentMap: Record<string, string> = {};
        data.forEach((item: any) => {
          contentMap[item.section_key] = item.content;
        });
        setContent(contentMap);
      }
    } catch (err) {
      console.error("Erreur inattendue loadContent:", err);
      toast.error("Erreur lors du chargement du contenu");
    }
  };

  const loadMembers = async () => {
    try {
      const { data: bdlMembersData, error: membersError } = await supabase
        .from("bdl_members")
        .select(
          `user_id, is_executive, display_order, profiles!inner (
            id,
            full_name,
            email,
            avatar_url
          )`
        )
        .order("is_executive", { ascending: false })
        .order("display_order", { ascending: true });

      if (membersError) {
        console.error("Erreur chargement membres:", membersError);
        toast.error("Erreur lors du chargement des membres");
        return;
      }

      const userIds = (bdlMembersData || []).map((m: any) => m.user_id);

      // Récupérer uniquement les rôles des utilisateurs concernés
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds || []);

      if (rolesError) {
        console.error("Erreur chargement rôles:", rolesError);
        // on continue sans block si roles échoue
      }

      const members: Member[] = (bdlMembersData || []).map((m: any) => {
        const profile = m.profiles;
        const rolesForUser = (rolesData || [])
          .filter((r: any) => r.user_id === m.user_id)
          .map((r: any) => r.role);

        return {
          id: profile.id,
          user_id: m.user_id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url || null,
          roles: rolesForUser,
          is_executive: m.is_executive,
          display_order: m.display_order ?? null,
        };
      });

      const executive = members.filter((m) => m.is_executive);
      const regular = members.filter((m) => !m.is_executive);

      setExecutiveMembers(executive);
      setRegularMembers(regular);
    } catch (err) {
      console.error("Erreur inattendue:", err);
      toast.error("Erreur lors du chargement des données");
    }
  };

  const getRoleLabel = (role: string): string => {
    if (!role) return "";
    if (role.startsWith("custom:")) {
      // retire le préfixe custom:
      return role.replace(/^custom:/, "");
    }
    const labels: Record<string, string> = {
      president: "Président",
      vice_president: "Vice-présidente",
      secretary_general: "Secrétaire Générale",
      communication_manager: "Responsable Communication",
      bdl_member: "Membre BDL",
    };
    return labels[role] || role;
  };

  // retourne la fonction personnalisée (sans préfixe) si elle existe
  const getCustomRole = (roles: string[]): string | null => {
    if (!roles || !Array.isArray(roles)) return null;
    const custom = roles.find((r) => r.startsWith("custom:"));
    return custom ? getRoleLabel(custom) : null;
  };

  const getInitials = (name: string): string => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleGradient = (roles: string[]): string => {
    if (!roles) return "gradient-institutional";
    if (roles.includes("president") || roles.includes("secretary_general"))
      return "gradient-institutional";
    if (roles.includes("vice_president") || roles.includes("communication_manager"))
      return "gradient-gold";
    return "gradient-institutional";
  };

  // Priorité pour le rôle principal (on ignore les rôles custom pour la priorité)
  const getPrimaryRole = (roles: string[]): string => {
    if (!roles || roles.length === 0) return "bdl_member";
    const priority = [
      "president",
      "vice_president",
      "secretary_general",
      "communication_manager",
      "bdl_member",
    ];
    for (const role of priority) {
      if (roles.includes(role)) return role;
    }
    // sinon si aucun rôle institutionnel trouvé, retourner le premier non-custom si possible
    const nonCustom = roles.find((r) => !r.startsWith("custom:"));
    if (nonCustom) return nonCustom;
    // fallback: si uniquement custom, on renvoie bdl_member comme libellé de badge
    return "bdl_member";
  };

  const renderMemberCard = (member: Member) => {
    const primaryRole = getPrimaryRole(member.roles);
    const gradient = getRoleGradient(member.roles);
    const customRole = getCustomRole(member.roles);

    return (
      <Card
        key={member.id}
        className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2"
      >
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col items-center space-y-4">
            {member.avatar_url ? (
              <Avatar className="w-24 h-24 ring-4 ring-background group-hover:scale-110 transition-transform duration-300">
                <AvatarImage src={member.avatar_url} alt={member.full_name} />
                <AvatarFallback className={`${gradient} text-white text-2xl font-bold`}>
                  {getInitials(member.full_name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div
                className={`w-24 h-24 rounded-full ${gradient} flex items-center justify-center text-white text-2xl font-bold shadow-elegant ring-4 ring-background group-hover:scale-110 transition-transform duration-300`}
              >
                {getInitials(member.full_name)}
              </div>
            )}

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">{member.full_name}</h3>

              <Badge variant="secondary" className="text-xs font-medium">
                {getRoleLabel(primaryRole)}
              </Badge>

              {customRole && (
                <p className="text-sm text-muted-foreground mt-1">{customRole}</p>
              )}

              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Le Bureau des Lycéens</h1>
              <p className="text-xl">
                {content.hero_subtitle || "Votre voix au sein de l'établissement"}
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-8">
              <Card className="shadow-card">
                <CardContent className="p-8">
                  <h2 className="text-3xl font-bold mb-6">
                    {content.mission_title || "Notre Mission"}
                  </h2>

                  <div
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{
                      __html:
                        content.mission_content ||
                        "<p>Le Bureau des Lycéens (BDL) du Lycée Saint-André est l'instance associative des élèves. Il a pour mission de favoriser l'expression, la participation et l'engagement des lycéens dans la vie de l'établissement, d'assurer le lien permanent entre les élèves, la communauté éducative et la direction, et de promouvoir les valeurs d'initiative, de respect et de responsabilité.</p>",
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl font-bold text-center mb-8">Équipe Exécutive</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                  {executiveMembers.map(renderMemberCard)}
                </div>
              </div>

              {regularMembers.length > 0 && (
                <div>
                  <h2 className="text-4xl font-bold text-center mb-8">Membres</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                    {regularMembers.map(renderMemberCard)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                {content.responsibilities_title || "Nos Responsabilités"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: content.resp_1_title || "Représentation globale des élèves",
                    description:
                      content.resp_1_description ||
                      "Porter la voix des lycéens auprès de l'administration, défendre leurs intérêts et veiller à la bonne communication entre élèves et corps enseignant.",
                  },
                  {
                    title: content.resp_2_title || "Organisation d'événements",
                    description:
                      content.resp_2_description ||
                      "Planifier et coordonner des manifestations culturelles, sportives et festives au bénéfice de la vie scolaire.",
                  },
                  {
                    title: content.resp_3_title || "Gestion des clubs",
                    description:
                      content.resp_3_description ||
                      "Accompagner les projets associatifs et clubs, soutenir leur gestion logistique et budgétaire.",
                  },
                  {
                    title: content.resp_4_title || "Médiation et écoute",
                    description:
                      content.resp_4_description ||
                      "Assurer un rôle d'écoute, recueillir les préoccupations des élèves et favoriser la médiation avec l'administration.",
                  },
                ].map((item, index) => (
                  <Card key={index} className="shadow-card">
                    <CardContent className="p-6 space-y-3">
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BDL;
