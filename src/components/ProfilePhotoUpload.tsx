import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, User } from "lucide-react";

interface ProfilePhotoUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
  onPhotoUpdate?: (newUrl: string) => void;
}

export const ProfilePhotoUpload = ({
  userId,
  currentAvatarUrl,
  fullName,
  onPhotoUpdate
}: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];

      // Vérifier le type de fichier
      if (!file.type.startsWith("image/")) {
        toast.error("Le fichier doit être une image");
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5 MB");
        return;
      }

      // Créer un nom de fichier unique
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Supprimer l'ancienne photo si elle existe
      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`avatars/${oldPath}`]);
        }
      }

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Mettre à jour le profil dans la base de données
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      if (onPhotoUpdate) {
        onPhotoUpdate(publicUrl);
      }
      toast.success("Photo de profil mise à jour avec succès");
    } catch (error: any) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
          <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <Label htmlFor="avatar-upload" className="text-sm font-medium">
            Photo de profil
          </Label>
          <div className="flex gap-2">
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploading}
              onClick={() => document.getElementById("avatar-upload")?.click()}
            >
              {uploading ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou GIF. Max 5 MB.
          </p>
        </div>
      </div>
    </div>
  );
};
