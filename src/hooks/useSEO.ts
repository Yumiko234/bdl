import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

const BASE_URL = "https://bdl-saintandre.fr";

export function useSEO({ title, description, image, url }: SEOProps) {
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

    if (image) {
      setMeta(`meta[property="og:image"]`, image);
      setMeta(`meta[name="twitter:image"]`, image);
    }

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
  }, [title, description, image, url]);
}
