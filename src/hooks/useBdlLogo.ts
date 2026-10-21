import logoBdl from "@/assets/logo-bdl.jpeg";
import logoBdlNoel from "@/assets/logo-bdl-noel.png";
import { useEventTheme } from "@/themes/EventThemeProvider";

export function useBdlLogo(): string {
  const { resolved } = useEventTheme();
  if (resolved.id === "noel") return logoBdlNoel;
  return logoBdl;
}
