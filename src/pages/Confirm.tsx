import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ConfirmStatus = "loading" | "success" | "error";

const Confirm = () => {
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Confirmation d'email – Bureau des Lycéens";

    const confirmEmail = async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!tokenHash || !type) {
        setStatus("error");
        setErrorMessage("Lien de confirmation invalide ou incomplet.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "signup" | "email" | "recovery" | "invite" | "email_change",
      });

      if (error) {
        setStatus("error");
        setErrorMessage(
          error.message === "Token has expired or is invalid"
            ? "Ce lien a expiré ou a déjà été utilisé. Merci de refaire une demande."
            : error.message
        );
      } else {
        setStatus("success");
        // Redirection automatique après quelques secondes
        setTimeout(() => navigate("/"), 3000);
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="py-16 gradient-institutional text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="text-5xl font-bold">Confirmation d'email</h1>
              <p className="text-xl">Bureau des Lycéens</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <Card className="shadow-card">
                <CardContent className="p-8 text-center space-y-6">
                  {status === "loading" && (
                    <>
                      <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                      <div>
                        <h2 className="text-2xl font-bold mb-2">Vérification en cours...</h2>
                        <p className="text-muted-foreground">
                          Merci de patienter pendant que nous confirmons votre adresse email.
                        </p>
                      </div>
                    </>
                  )}

                  {status === "success" && (
                    <>
                      <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
                      <div>
                        <h2 className="text-2xl font-bold mb-2">Email confirmé !</h2>
                        <p className="text-muted-foreground">
                          Votre compte est activé. Vous allez être redirigé automatiquement...
                        </p>
                      </div>
                      <Button asChild className="w-full">
                        <Link to="/">Accéder au site maintenant</Link>
                      </Button>
                    </>
                  )}

                  {status === "error" && (
                    <>
                      <XCircle className="h-16 w-16 mx-auto text-destructive" />
                      <div>
                        <h2 className="text-2xl font-bold mb-2">Échec de la confirmation</h2>
                        <p className="text-muted-foreground">{errorMessage}</p>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/">Retour à l'accueil</Link>
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Confirm;