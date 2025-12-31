import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [validLink, setValidLink] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ===================== HANDLE RECOVERY SESSION ===================== */

  useEffect(() => {
    // On écoute les changements d'état d'authentification
    // PASSWORD_RECOVERY est l'événement déclenché par le lien du mail
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidLink(true);
        setLoading(false);
      } else {
        // Si après 2 secondes on n'a rien, on considère le lien invalide
        const timeout = setTimeout(() => {
          if (!validLink) setLoading(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    });

    return () => subscription.unsubscribe();
  }, [validLink]);

  /* ===================== CHANGE PASSWORD ===================== */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rechargement de la page

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setSubmitting(true);
    try {
      // Pas besoin d'ID, Supabase utilise la session actuelle du lien
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès");
      
      // On attend un peu pour que l'utilisateur voit le toast
      setTimeout(() => navigate("/auth"), 2000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===================== RENDER ===================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-pulse text-lg font-medium">Vérification du lien...</div>
      </div>
    );
  }

  if (!validLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive text-center">Lien invalide</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Ce lien de réinitialisation est invalide, a expiré ou a déjà été utilisé.
            </p>
            <Button variant="outline" onClick={() => navigate("/auth")} className="w-full">
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="max-w-md w-full shadow-lg border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold">
            Nouveau mot de passe
          </CardTitle>
          <p className="text-sm text-center text-muted-foreground">
            Sécurisez votre compte avec un nouveau mot de passe.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Mise à jour en cours..." : "Changer le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
