import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, ZoomIn, MoveHorizontal, MoveVertical } from "lucide-react";

interface ProfilePhotoUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
  onPhotoUpdate?: (newUrl: string) => void;
}

// Taille du preview dans la modale (px)
const PREVIEW = 220;
// Taille exportée vers Supabase (px)
const EXPORT = 400;

export const ProfilePhotoUpload = ({
  userId,
  currentAvatarUrl,
  fullName,
  onPhotoUpdate,
}: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);

  // État de la modale
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  // zoom : 1 = image remplit le cercle, >1 = agrandissement
  const [zoom, setZoom] = useState(1);
  // offsetX/Y en % : 0 = centré, -50 = décalé au max à gauche/haut
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Image trop grande (max 15 MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgSrc(ev.target?.result as string);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Calcule les paramètres CSS pour afficher l'image dans le cercle
  const getPreviewStyle = useCallback((): React.CSSProperties => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return {};
    const { naturalWidth: w, naturalHeight: h } = img;
    // Echelle de base : remplir le côté le plus court
    const base = PREVIEW / Math.min(w, h);
    const dw = w * base * zoom;
    const dh = h * base * zoom;
    // Espace disponible pour le décalage
    const spaceX = Math.max(0, dw - PREVIEW);
    const spaceY = Math.max(0, dh - PREVIEW);
    const left = (PREVIEW - dw) / 2 + (offsetX / 100) * spaceX;
    const top  = (PREVIEW - dh) / 2 + (offsetY / 100) * spaceY;
    return {
      position: "absolute",
      width:  dw,
      height: dh,
      left,
      top,
      pointerEvents: "none",
      userSelect: "none",
    };
  }, [zoom, offsetX, offsetY]);

  const handleConfirm = async () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    setUploading(true);

    const { naturalWidth: w, naturalHeight: h } = img;
    const base = PREVIEW / Math.min(w, h);
    const scale = base * zoom;
    const dw = w * scale;
    const dh = h * scale;
    const spaceX = Math.max(0, dw - PREVIEW);
    const spaceY = Math.max(0, dh - PREVIEW);
    const left = (PREVIEW - dw) / 2 + (offsetX / 100) * spaceX;
    const top  = (PREVIEW - dh) / 2 + (offsetY / 100) * spaceY;

    // Recadrage en coordonnées naturelles
    const cropX = -left / scale;
    const cropY = -top  / scale;
    const cropW =  PREVIEW / scale;

    canvas.width  = EXPORT;
    canvas.height = EXPORT;
    canvas.getContext("2d")!.drawImage(img, cropX, cropY, cropW, cropW, 0, 0, EXPORT, EXPORT);

    canvas.toBlob(async (blob) => {
      if (!blob) { toast.error("Erreur de recadrage"); setUploading(false); return; }
      try {
        const path = `avatars/${userId}-${Date.now()}.jpg`;
        if (avatarUrl) {
          const old = avatarUrl.split("/").pop();
          if (old) await supabase.storage.from("avatars").remove([`avatars/${old}`]);
        }
        const { error: upErr } = await supabase.storage
          .from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
        if (dbErr) throw dbErr;
        setAvatarUrl(publicUrl);
        onPhotoUpdate?.(publicUrl);
        toast.success("Photo mise à jour ✓");
        setOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    }, "image/jpeg", 0.92);
  };

  return (
    <>
      {/* Avatar + crayon */}
      <div className="flex items-center gap-5">
        <div className="relative inline-block shrink-0">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={avatarUrl || undefined} alt={fullName} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            disabled={uploading}
            onClick={() => document.getElementById("avatar-file-input")?.click()}
            title="Modifier la photo"
            className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 ring-2 ring-background"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Cliquez sur le <strong>crayon</strong> pour modifier la photo.</p>
          <p className="mt-0.5 text-xs">JPG · PNG · GIF · max 15 MB</p>
        </div>
      </div>

      <input
        id="avatar-file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {/* Modale de recadrage */}
      <Dialog open={open} onOpenChange={(v) => { if (!uploading) setOpen(v); }}>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recadrer la photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Aperçu circulaire */}
            <div className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-full ring-4 ring-primary bg-muted"
                style={{ width: PREVIEW, height: PREVIEW }}
              >
                {imgSrc && (
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt=""
                    onLoad={() => {
                      // Force un re-render pour que getPreviewStyle recalcule
                      setZoom(z => z);
                    }}
                    style={getPreviewStyle()}
                    draggable={false}
                  />
                )}
              </div>
            </div>

            {/* Contrôles */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <ZoomIn className="h-3.5 w-3.5" /> Zoom
                </Label>
                <Slider min={1} max={3} step={0.02} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <MoveHorizontal className="h-3.5 w-3.5" /> Position horizontale
                </Label>
                <Slider min={-100} max={100} step={1} value={[offsetX]} onValueChange={([v]) => setOffsetX(v)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <MoveVertical className="h-3.5 w-3.5" /> Position verticale
                </Label>
                <Slider min={-100} max={100} step={1} value={[offsetY]} onValueChange={([v]) => setOffsetY(v)} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={uploading}>
              {uploading ? "Enregistrement..." : "Appliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
};
