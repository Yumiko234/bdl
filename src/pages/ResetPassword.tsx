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

  /* ===================== HANDLE RECOVERY LINK ===================== */

  useEffect(() => {
    const handleRecovery = async () => {
      const hash = window.location.hash;

      if (!hash.includes("access_token")) {
        setValidLink(false);
        setLoading(false);
        return;
      }

      try {
        // Supabase gère automatiquement la session depuis le hash
        const { error } = await supabase.auth.getSession();
        if (error) throw error;

        setValidLink(true);
      } catch (err) {
        console.error(err);
        setValidLink(false);
      } finally {
        setLoading(false);
      }
    };

    handleRecovery();
  }, []);

  /* ===================== CHANGE PASSWORD ===================== */

  const handleSubmit = async () => {
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
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès");
      navigate("/auth");
    } catch (error) {
      console.error(error);
      toast.error("Lien invalide ou expiré");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===================== RENDER ===================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Chargement…
      </div>
    );
  }

  if (!validLink) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Lien invalide</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Ce lien de réinitialisation est invalide ou a expiré.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="max-w-md w-full shadow-card">
        <CardHeader>
          <CardTitle className="text-center">
            Réinitialisation du mot de passe
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Label>Confirmer le mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Modification…" : "Réinitialiser le mot de passe"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
