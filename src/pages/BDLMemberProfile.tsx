import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, Mail, MessageCircle, Calendar, GraduationCap, Lightbulb, Award } from "lucide-react";

interface MemberProfile {
  id: string;
  full_name: string;
  slug: string;
  photo_url: string | null;
  age: number | null;
  role: string | null;
  class: string | null;
  contact_method: string | null;
  biography: string | null;
  career_path: string | null;
  anecdote: string | null;
}

const BDLMemberProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadProfile();
    }
  }, [slug]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("bdl_member_profiles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Profil introuvable");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Chargement...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold">Profil introuvable</h2>
              <p className="text-muted-foreground">
                Ce membre n'existe pas ou son profil n'est pas encore publié.
              </p>
              <Link to="/bdl">
                <Button>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Retour au BDL
                </Button>
              </Link>
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
        {/* Hero Section */}
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <Link to="/bdl">
                <Button variant="outline" className="mb-4 border-white text-black hover:bg-white hover:text-primary">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Retour au BDL
                </Button>
              </Link>

              {/* Photo de profil */}
              <div className="flex justify-center">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name}
                    className="h-40 w-40 rounded-full object-cover ring-4 ring-white shadow-elegant"
                  />
                ) : (
                  <div className="h-40 w-40 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold shadow-elegant ring-4 ring-white">
                    {getInitials(profile.full_name)}
                  </div>
                )}
              </div>

              <h1 className="text-5xl font-bold">{profile.full_name}</h1>

              {/* Badges d'informations */}
              <div className="flex flex-wrap justify-center gap-2">
                {profile.role && (
                  <Badge className="bg-white/20 text-white border-white/30 text-base py-1 px-3">
                    <Award className="h-4 w-4 mr-1" />
                    {profile.role}
                  </Badge>
                )}
                {profile.age && (
                  <Badge className="bg-white/20 text-white border-white/30 text-base py-1 px-3">
                    <Calendar className="h-4 w-4 mr-1" />
                    {profile.age} ans
                  </Badge>
                )}
                {profile.class && (
                  <Badge className="bg-white/20 text-white border-white/30 text-base py-1 px-3">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    {profile.class}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        {profile.contact_method && (
          <section className="py-8 bg-accent/10">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="flex items-center justify-center gap-2">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  <span className="font-medium">Contact :</span>
                  <span className="text-muted-foreground">{profile.contact_method}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Contenu principal */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Biographie */}
              {profile.biography && (
                <Card className="shadow-card">
                  <CardContent className="p-8 space-y-4">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                      <Mail className="h-8 w-8 text-primary" />
                      Biographie
                    </h2>
                    <p className="text-lg leading-relaxed whitespace-pre-line">
                      {profile.biography}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Parcours */}
              {profile.career_path && (
                <Card className="shadow-card">
                  <CardContent className="p-8 space-y-4">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                      <GraduationCap className="h-8 w-8 text-primary" />
                      Parcours
                    </h2>
                    <p className="text-lg leading-relaxed whitespace-pre-line">
                      {profile.career_path}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Anecdote */}
              {profile.anecdote && (
                <Card className="shadow-card bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                  <CardContent className="p-8 space-y-4">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                      <Lightbulb className="h-8 w-8 text-accent" />
                      Anecdote
                    </h2>
                    <p className="text-lg leading-relaxed whitespace-pre-line italic">
                      {profile.anecdote}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BDLMemberProfile;
