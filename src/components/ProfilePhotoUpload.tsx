import { useState, useRef, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, ZoomIn, MoveHorizontal, MoveVertical, Upload, Crop } from "lucide-react";

interface ProfilePhotoUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
  onPhotoUpdate?: (newUrl: string) => void;
}

// Taille du cercle de prévisualisation (px)
const PREVIEW = 220;
// Taille exportée (px)
const EXPORT = 400;

export const ProfilePhotoUpload = ({
  userId,
  currentAvatarUrl,
  fullName,
  onPhotoUpdate,
}: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);

  // Modale de recadrage
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  // -100 = bord gauche/haut visible  |  0 = centré  |  +100 = bord droit/bas visible
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Chargement d'un nouveau fichier ─────────────────────────────────────────
  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Image trop grande (max 15 MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgSrc(ev.target?.result as string);
      setDims({ w: 0, h: 0 });
      setZoom(1);
      setOffsetX(0);
      setOffsetY(-100);
      setOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) loadFile(file);
  };

  // ── Recadrer la photo existante ──────────────────────────────────────────────
  const handleAdjustExisting = () => {
    if (!avatarUrl) return;
    const sep = avatarUrl.includes("?") ? "&" : "?";
    setImgSrc(`${avatarUrl}${sep}_t=${Date.now()}`);
    setDims({ w: 0, h: 0 });
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setOpen(true);
  };

  // ── Espace de débordement (mémoïsé) ─────────────────────────────────────────
  const space = useMemo(() => {
    if (!dims.w) return { spaceX: 0, spaceY: 0 };
    const base  = PREVIEW / Math.min(dims.w, dims.h);
    const scale = base * zoom;
    return {
      spaceX: Math.max(0, dims.w * scale - PREVIEW),
      spaceY: Math.max(0, dims.h * scale - PREVIEW),
    };
  }, [dims, zoom]);

  // ── Drag gestuel sur l'aperçu ────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offsetX, oy: offsetY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !dims.w) return;
    const { sx, sy, ox, oy } = dragRef.current;
    const { spaceX, spaceY } = space;
    if (spaceX > 0) {
      const dox = -(e.clientX - sx) / spaceX * 200;
      setOffsetX(Math.min(100, Math.max(-100, ox + dox)));
    }
    if (spaceY > 0) {
      const doy = -(e.clientY - sy) / spaceY * 200;
      setOffsetY(Math.min(100, Math.max(-100, oy + doy)));
    }
  };

  const handlePointerUp = () => { dragRef.current = null; };

  // ── Calcul du style d'affichage (pur, pas de ref) ───────────────────────────
  const previewStyle = useMemo((): React.CSSProperties => {
    if (!dims.w || !dims.h) return { display: "none" };
    const base  = PREVIEW / Math.min(dims.w, dims.h);
    const scale = base * zoom;
    const dw    = dims.w * scale;
    const dh    = dims.h * scale;
    // Espace de débordement dans chaque axe
    const spaceX = Math.max(0, dw - PREVIEW);
    const spaceY = Math.max(0, dh - PREVIEW);
    // offsetX ∈ [-100, 100] : -100 → left=0 (bord gauche), +100 → left=-(dw-PREVIEW)
    const left = -((offsetX + 100) / 200) * spaceX;
    const top  = -((offsetY + 100) / 200) * spaceY;
    return {
      position: "absolute",
      width: dw,
      height: dh,
      maxWidth: "none",
      left,
      top,
      pointerEvents: "none",
      userSelect: "none",
    };
  }, [dims, zoom, offsetX, offsetY]);

  // ── Export canvas → upload ───────────────────────────────────────────────────
  const handleConfirm = async () => {
    const img    = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !dims.w) return;
    setUploading(true);

    const base   = PREVIEW / Math.min(dims.w, dims.h);
    const scale  = base * zoom;
    const dw     = dims.w * scale;
    const dh     = dims.h * scale;
    const spaceX = Math.max(0, dw - PREVIEW);
    const spaceY = Math.max(0, dh - PREVIEW);
    const left   = -((offsetX + 100) / 200) * spaceX;
    const top    = -((offsetY + 100) / 200) * spaceY;

    // Coordonnées de recadrage dans l'espace naturel de l'image
    const cropX = -left  / scale;
    const cropY = -top   / scale;
    const cropW =  PREVIEW / scale;

    canvas.width  = EXPORT;
    canvas.height = EXPORT;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, EXPORT, EXPORT);
    ctx.drawImage(img, cropX, cropY, cropW, cropW, 0, 0, EXPORT, EXPORT);

    try { canvas.toBlob(async (blob) => {
      if (!blob) { toast.error("Erreur de recadrage"); setUploading(false); return; }
      try {
        const path = `avatars/${userId}-${Date.now()}.jpg`;
        if (avatarUrl) {
          const old = avatarUrl.split("/avatars/").pop();
          if (old) await supabase.storage.from("avatars").remove([`avatars/${old}`]);
        }
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        const { error: dbErr } = await supabase
          .from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
        if (dbErr) throw dbErr;

        setAvatarUrl(publicUrl);
        onPhotoUpdate?.(publicUrl);
        window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { url: publicUrl } }));
        toast.success("Photo mise à jour ✓");
        setOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    }, "image/jpeg", 0.92); } catch { toast.error("Impossible de recadrer (image protégée)"); setUploading(false); }
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center gap-5">
        {/* Avatar + crayon */}
        <div className="relative inline-block shrink-0">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={avatarUrl || undefined} alt={fullName} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>

          {avatarUrl ? (
            // Photo existante → menu choix
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={uploading}
                  title="Modifier la photo"
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 ring-2 ring-background"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer une nouvelle photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAdjustExisting}>
                  <Crop className="h-4 w-4 mr-2" />
                  Recadrer la photo actuelle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Pas de photo → ouvre directement le sélecteur
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Ajouter une photo"
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 ring-2 ring-background"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Cliquez sur le <strong>crayon</strong> pour modifier la photo.</p>
          <p className="mt-0.5 text-xs">JPG · PNG · GIF · max 15 MB</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
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
            {/* Aperçu circulaire — drag pour repositionner */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="relative overflow-hidden rounded-full ring-4 ring-primary bg-muted select-none"
                style={{
                  width: PREVIEW,
                  height: PREVIEW,
                  cursor: (space.spaceX > 0 || space.spaceY > 0) ? "move" : "default",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {imgSrc && (
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt=""
                    crossOrigin="anonymous"
                    onLoad={() => {
                      const img = imgRef.current;
                      if (img) setDims({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    style={previewStyle}
                    draggable={false}
                  />
                )}
              </div>
              {(space.spaceX > 0 || space.spaceY > 0) && (
                <p className="text-xs text-muted-foreground">Faites glisser pour repositionner</p>
              )}
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <ZoomIn className="h-3.5 w-3.5" /> Zoom
                </Label>
                <Slider min={1} max={3} step={0.02} value={[zoom]}
                  onValueChange={([v]) => setZoom(v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <MoveHorizontal className="h-3.5 w-3.5" /> Position horizontale
                </Label>
                <Slider min={-100} max={100} step={1} value={[offsetX]}
                  onValueChange={([v]) => setOffsetX(v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <MoveVertical className="h-3.5 w-3.5" /> Position verticale
                </Label>
                <Slider min={-100} max={100} step={1} value={[offsetY]}
                  onValueChange={([v]) => setOffsetY(v)} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={uploading || !dims.w}>
              {uploading ? "Enregistrement..." : "Appliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
};
