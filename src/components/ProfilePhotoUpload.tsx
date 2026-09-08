import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ZoomIn } from "lucide-react";

interface ProfilePhotoUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string;
  onPhotoUpdate?: (newUrl: string) => void;
}

const CROP_PX = 240;
const EXPORT_PX = 400;

export const ProfilePhotoUpload = ({
  userId,
  currentAvatarUrl,
  fullName,
  onPhotoUpdate,
}: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [cropOpen, setCropOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [naturalDims, setNaturalDims] = useState({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const clamp = useCallback((x: number, y: number, z: number, w: number, h: number) => {
    if (!w || !h) return { x, y };
    const base = CROP_PX / Math.min(w, h);
    const dw = w * base * z;
    const dh = h * base * z;
    return {
      x: Math.min(0, Math.max(CROP_PX - dw, x)),
      y: Math.min(0, Math.max(CROP_PX - dh, y)),
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop grande (max 10 MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgSrc(ev.target?.result as string);
      setPos({ x: 0, y: 0 });
      setZoom(1);
      setNaturalDims({ w: 0, h: 0 });
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const { naturalWidth: w, naturalHeight: h } = img;
    setNaturalDims({ w, h });
    const base = CROP_PX / Math.min(w, h);
    setPos({
      x: -(w * base - CROP_PX) / 2,
      y: -(h * base - CROP_PX) / 2,
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { sx, sy, px, py } = dragRef.current;
    const nx = px + (e.clientX - sx);
    const ny = py + (e.clientY - sy);
    setPos(clamp(nx, ny, zoom, naturalDims.w, naturalDims.h));
  };

  const handlePointerUp = () => { dragRef.current = null; };

  const handleZoomChange = (val: number[]) => {
    const z = val[0];
    const { w, h } = naturalDims;
    if (!w) { setZoom(z); return; }
    const oldBase = CROP_PX / Math.min(w, h);
    const oldScale = oldBase * zoom;
    const newScale = oldBase * z;
    // Keep image point under container center fixed
    const ix = (CROP_PX / 2 - pos.x) / oldScale;
    const iy = (CROP_PX / 2 - pos.y) / oldScale;
    const newPx = CROP_PX / 2 - ix * newScale;
    const newPy = CROP_PX / 2 - iy * newScale;
    setZoom(z);
    setPos(clamp(newPx, newPy, z, w, h));
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    setUploading(true);
    const { naturalWidth: w, naturalHeight: h } = img;
    const base = CROP_PX / Math.min(w, h);
    const displayScale = base * zoom;
    const cropX = -pos.x / displayScale;
    const cropY = -pos.y / displayScale;
    const cropW = CROP_PX / displayScale;
    canvas.width = EXPORT_PX;
    canvas.height = EXPORT_PX;
    canvas.getContext("2d")!.drawImage(img, cropX, cropY, cropW, cropW, 0, 0, EXPORT_PX, EXPORT_PX);
    canvas.toBlob(async (blob) => {
      if (!blob) { toast.error("Erreur de recadrage"); setUploading(false); return; }
      try {
        const fileName = `${userId}-${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;
        if (avatarUrl) {
          const oldName = avatarUrl.split("/").pop();
          if (oldName) await supabase.storage.from("avatars").remove([`avatars/${oldName}`]);
        }
        const { error: uploadError } = await supabase.storage
          .from("avatars").upload(filePath, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
        if (updateError) throw updateError;
        setAvatarUrl(publicUrl);
        onPhotoUpdate?.(publicUrl);
        toast.success("Photo mise à jour");
        setCropOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    }, "image/jpeg", 0.92);
  };

  const imgStyle = naturalDims.w ? {
    position: "absolute" as const,
    left: pos.x,
    top: pos.y,
    width: naturalDims.w * (CROP_PX / Math.min(naturalDims.w, naturalDims.h)) * zoom,
    height: naturalDims.h * (CROP_PX / Math.min(naturalDims.w, naturalDims.h)) * zoom,
    pointerEvents: "none" as const,
    userSelect: "none" as const,
    draggable: false,
  } : { display: "none" as const };

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
          <Label htmlFor="avatar-upload" className="text-sm font-medium">Photo de profil</Label>
          <div className="flex gap-2">
            <Input id="avatar-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="cursor-pointer" />
            <Button type="button" variant="outline" size="icon" disabled={uploading} onClick={() => document.getElementById("avatar-upload")?.click()}>
              {uploading
                ? <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                : <Upload className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Max 10 MB.</p>
        </div>
      </div>

      <Dialog open={cropOpen} onOpenChange={(o) => { if (!uploading) setCropOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recadrer la photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Faites glisser pour positionner votre visage dans le cercle.</p>
            <div className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-full cursor-move ring-2 ring-primary bg-muted select-none"
                style={{ width: CROP_PX, height: CROP_PX }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {imgSrc && (
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="recadrage"
                    onLoad={handleImgLoad}
                    style={imgStyle}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <ZoomIn className="h-4 w-4" /> Zoom
              </Label>
              <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={handleZoomChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)} disabled={uploading}>Annuler</Button>
            <Button onClick={handleConfirm} disabled={uploading || !naturalDims.w}>
              {uploading ? "Enregistrement..." : "Appliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
