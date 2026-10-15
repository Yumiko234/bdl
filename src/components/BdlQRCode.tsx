import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import logoBdl from "@/assets/logo-bdl.jpeg";

// Pre-renders the BDL logo clipped to a circle as a data URL, or null on failure
function makeCircularLogo(src: string, size: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d")!;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

interface BdlQRCodeProps {
  value: string;
  size?: number;
  id?: string;
}

export function BdlQRCode({ value, size = 200, id }: BdlQRCodeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    let cancelled = false;

    const logoSize = Math.round(size * 0.22);

    makeCircularLogo(logoBdl, logoSize * 4).then((circularSrc) => {
      if (cancelled || !container.isConnected) return;
      container.innerHTML = "";

      const qrOptions: ConstructorParameters<typeof QRCodeStyling>[0] = {
        width: size,
        height: size,
        data: value,
        dotsOptions: { color: "#07419e", type: "rounded" },
        cornersSquareOptions: { type: "extra-rounded", color: "#07419e" },
        cornersDotOptions: { color: "#07419e" },
        backgroundOptions: { color: "#ffffff" },
        qrOptions: { errorCorrectionLevel: "H" },
      };

      if (circularSrc) {
        qrOptions.image = circularSrc;
        qrOptions.imageOptions = {
          margin: 2,
          imageSize: 0.52,
          hideBackgroundDots: true,
        };
      }

      const qr = new QRCodeStyling(qrOptions);
      qr.append(container);

      if (id) {
        setTimeout(() => {
          if (cancelled) return;
          const canvas = container.querySelector("canvas");
          if (canvas) canvas.id = id;
        }, 100);
      }
    });

    return () => { cancelled = true; };
  }, [value, size, id]);

  return <div ref={ref} style={{ lineHeight: 0 }} />;
}
