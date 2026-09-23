import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";

const CLASS_OPTIONS = [
  {
    label: "Seconde",
    values: Array.from({ length: 8 }, (_, i) => `Seconde ${i + 1}`),
  },
  {
    label: "Première",
    values: Array.from({ length: 6 }, (_, i) => `Première ${i + 1}`),
  },
  {
    label: "Terminale",
    values: Array.from({ length: 6 }, (_, i) => `Terminale ${i + 1}`),
  },
];

const Auth = () => {
  const [loginCredentials, setLoginCredentials] = useState({ email: "", password: "" });
  const [signupCredentials, setSignupCredentials] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "",
    firstName: "",
    lastName: "",
    className: ""
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Connexion – Bureau des Lycéens";
    if (user) {
      navigate('/intranet');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await signIn(loginCredentials.email, loginCredentials.password);
    if (!error) {
      navigate('/intranet');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupCredentials.password.length < 12) {
      toast.error("Le mot de passe doit contenir au moins 12 caractères");
      return;
    }

    if (signupCredentials.password !== signupCredentials.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Vous devez accepter les CGU et la Politique de confidentialité pour vous inscrire.");
      return;
    }

    if (!signupCredentials.className) {
      toast.error("Veuillez sélectionner votre classe.");
      return;
    }

    await signUp(
      signupCredentials.email,
      signupCredentials.password,
      signupCredentials.firstName,
      signupCredentials.lastName,
      signupCredentials.className
    );
  };

  const handleForgotPassword = async () => {
    if (!loginCredentials.email) {
      toast.error("Veuillez saisir votre email dans le champ ci-dessus.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginCredentials.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success("Email de réinitialisation envoyé ! Cliquez le lien depuis ce navigateur (pas un autre appareil). Vérifiez vos spams.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <MaintenanceOverlay>
          <section className="py-16 gradient-institutional text-white">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center space-y-4">
                <Shield className="h-20 w-20 mx-auto" />
                <h1 className="text-5xl font-bold">Authentification</h1>
                <p className="text-xl">Connectez-vous ou créez un compte pour accéder à l'intranet</p>
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Connexion</TabsTrigger>
                    <TabsTrigger value="signup">Inscription</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <Card className="shadow-elegant">
                      <CardContent className="p-8 space-y-6">
                        <div className="text-center space-y-2">
                          <div className="w-16 h-16 rounded-full gradient-institutional mx-auto flex items-center justify-center">
                            <Lock className="h-8 w-8 text-white" />
                          </div>
                          <h2 className="text-2xl font-bold">Connexion</h2>
                          <p className="text-sm text-muted-foreground">
                            Accédez à votre espace sécurisé
                          </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <Input
                              id="login-email"
                              type="email"
                              required
                              value={loginCredentials.email}
                              onChange={(e) => setLoginCredentials({ ...loginCredentials, email: e.target.value })}
                              placeholder="votre.email@exemple.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="login-password">Mot de passe</Label>
                              <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                Mot de passe oublié ?
                              </button>
                            </div>
                            <Input
                              id="login-password"
                              type="password"
                              required
                              value={loginCredentials.password}
                              onChange={(e) => setLoginCredentials({ ...loginCredentials, password: e.target.value })}
                              placeholder="Votre mot de passe"
                            />
                          </div>

                          <Button type="submit" className="w-full" size="lg">
                            Se connecter
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="signup">
                    <Card className="shadow-elegant">
                      <CardContent className="p-8 space-y-6">
                        <div className="text-center space-y-2">
                          <div className="w-16 h-16 rounded-full gradient-institutional mx-auto flex items-center justify-center">
                            <UserPlus className="h-8 w-8 text-white" />
                          </div>
                          <h2 className="text-2xl font-bold">Inscription</h2>
                          <p className="text-sm text-muted-foreground">
                            Créez votre compte pour accéder à l'intranet
                          </p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-firstname">Prénom</Label>
                            <Input
                              id="signup-firstname"
                              required
                              value={signupCredentials.firstName}
                              onChange={(e) => setSignupCredentials({ ...signupCredentials, firstName: e.target.value })}
                              placeholder="Votre prénom"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="signup-lastname">Nom de famille</Label>
                            <Input
                              id="signup-lastname"
                              required
                              value={signupCredentials.lastName}
                              onChange={(e) =>
                                setSignupCredentials({
                                  ...signupCredentials,
                                  // Le nom de famille est toujours affiché/saisi en majuscules
                                  lastName: e.target.value.toUpperCase(),
                                })
                              }
                              placeholder="VOTRE NOM DE FAMILLE"
                              className="uppercase"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="signup-class">Classe</Label>
                            <Select
                              value={signupCredentials.className}
                              onValueChange={(value) => setSignupCredentials({ ...signupCredentials, className: value })}
                            >
                              <SelectTrigger id="signup-class">
                                <SelectValue placeholder="Sélectionnez votre classe" />
                              </SelectTrigger>
                              <SelectContent>
                                {CLASS_OPTIONS.map((group) => (
                                  <SelectGroup key={group.label}>
                                    <SelectLabel>{group.label}</SelectLabel>
                                    {group.values.map((value) => (
                                      <SelectItem key={value} value={value}>
                                        {value}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <Input
                              id="signup-email"
                              type="email"
                              required
                              value={signupCredentials.email}
                              onChange={(e) => setSignupCredentials({ ...signupCredentials, email: e.target.value })}
                              placeholder="votre.email@exemple.fr"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="signup-password">Mot de passe</Label>
                            <Input
                              id="signup-password"
                              type="password"
                              required
                              value={signupCredentials.password}
                              onChange={(e) => setSignupCredentials({ ...signupCredentials, password: e.target.value })}
                              placeholder="Choisissez un mot de passe"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
                            <Input
                              id="signup-confirm"
                              type="password"
                              required
                              value={signupCredentials.confirmPassword}
                              onChange={(e) => setSignupCredentials({ ...signupCredentials, confirmPassword: e.target.value })}
                              placeholder="Confirmez votre mot de passe"
                            />
                          </div>

                          {/* CASE À COCHER CGU / PRIVACY / MENTIONS LÉGALES */}
                          <div className="flex items-start space-x-3 pt-2">
                            <Checkbox
                              id="terms"
                              checked={acceptedTerms}
                              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                              className="mt-1"
                            />
                            <Label htmlFor="terms" className="text-xs text-muted-foreground leading-normal font-normal cursor-pointer">
                              J'accepte les{" "}
                              <Link to="/legal/cgu" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium hover:text-primary/80">
                                CGU
                              </Link>
                              , la{" "}
                              <Link to="/legal/confidentialite" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium hover:text-primary/80">
                                Politique de confidentialité
                              </Link>{" "}
                              et j'ai pris connaissance des{" "}
                              <Link to="/legal/mentions-legales" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium hover:text-primary/80">
                                Mentions légales
                              </Link>
                              .
                            </Label>
                          </div>

                          <Button type="submit" className="w-full" size="lg">
                            S'inscrire
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </section>
        </MaintenanceOverlay>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;