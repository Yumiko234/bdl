import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
const [resetEmail, setResetEmail] = useState("");
const [showResetForm, setShowResetForm] = useState(false);
const [isResetting, setIsResetting] = useState(false);

const handlePasswordReset = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!resetEmail) {
    toast.error("Veuillez entrer votre adresse email");
    return;
  }

  setIsResetting(true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;

    toast.success("Un email de réinitialisation a été envoyé à votre adresse");
    setShowResetForm(false);
    setResetEmail("");
  } catch (error: any) {
    console.error(error);
    toast.error(error.message || "Erreur lors de l'envoi de l'email");
  } finally {
    setIsResetting(false);
  }
};

const Auth = () => {
  const [loginCredentials, setLoginCredentials] = useState({ email: "", password: "" });
  const [signupCredentials, setSignupCredentials] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "",
    fullName: ""
  });
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
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
    
    if (signupCredentials.password !== signupCredentials.confirmPassword) {
      return;
    }

    await signUp(signupCredentials.email, signupCredentials.password, signupCredentials.fullName);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
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
                          <Label htmlFor="login-password">Mot de passe</Label>
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

                <Button type="submit" className="w-full" size="lg">
        Se connecter
      </Button>
    </form>

    <div className="text-center">
      <button
        onClick={() => setShowResetForm(true)}
        className="text-sm text-primary hover:underline"
      >
        Mot de passe oublié ?
      </button>
    </div>
  </>
) : (
  <form onSubmit={handlePasswordReset} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="reset-email">Adresse email</Label>
      <Input
        id="reset-email"
        type="email"
        required
        value={resetEmail}
        onChange={(e) => setResetEmail(e.target.value)}
        placeholder="votre.email@exemple.com"
      />
      <p className="text-xs text-muted-foreground">
        Vous recevrez un lien de réinitialisation par email
      </p>
    </div>

    <div className="flex gap-2">
      <Button 
        type="submit" 
        className="flex-1" 
        disabled={isResetting}
      >
        {isResetting ? "Envoi..." : "Envoyer le lien"}
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => {
          setShowResetForm(false);
          setResetEmail("");
        }}
      >
        Annuler
      </Button>
    </div>
  </form>
)}

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
                          <Label htmlFor="signup-name">Nom complet</Label>
                          <Input
                            id="signup-name"
                            required
                            value={signupCredentials.fullName}
                            onChange={(e) => setSignupCredentials({ ...signupCredentials, fullName: e.target.value })}
                            placeholder="Votre Prénom et Nom complet"
                          />
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
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
