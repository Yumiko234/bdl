import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = "https://bdl-saintandre.fr";
const DEFAULT_IMAGE = `${BASE_URL}/logo-bdl.jpeg`;

export function useSEO({ title, description, image, url, jsonLd }: SEOProps) {
  const resolvedImage = image ?? DEFAULT_IMAGE;
  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        const [attr, val] = selector.includes("property")
          ? ["property", selector.match(/\[property="([^"]+)"\]/)?.[1] ?? ""]
          : ["name", selector.match(/\[name="([^"]+)"\]/)?.[1] ?? ""];
        el = document.createElement("meta");
        el.setAttribute(attr, val);
        document.head.appendChild(el);
      }
      (el as HTMLMetaElement).content = value;
    };

    setMeta(`meta[property="og:title"]`, title);
    setMeta(`meta[name="twitter:title"]`, title);

    if (description) {
      setMeta(`meta[name="description"]`, description);
      setMeta(`meta[property="og:description"]`, description);
      setMeta(`meta[name="twitter:description"]`, description);
    }

    setMeta(`meta[property="og:type"]`, "website");
    setMeta(`meta[name="twitter:card"]`, "summary_large_image");
    setMeta(`meta[property="og:image"]`, resolvedImage);
    setMeta(`meta[name="twitter:image"]`, resolvedImage);

    const canonical = url ? `${BASE_URL}${url}` : undefined;
    if (canonical) {
      setMeta(`meta[property="og:url"]`, canonical);
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    const SEO_SCRIPT_ID = "seo-jsonld";
    const existing = document.getElementById(SEO_SCRIPT_ID);
    if (jsonLd) {
      const script = (existing as HTMLScriptElement | null) ?? document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.id = SEO_SCRIPT_ID;
      script.textContent = JSON.stringify(jsonLd);
      if (!existing) document.head.appendChild(script);
    } else if (existing) {
      existing.remove();
    }
  }, [title, description, image, url, jsonLd]);
}
