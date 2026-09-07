import DOMPurify from "dompurify";

/**
 * Nettoie une chaîne HTML avant de l'injecter via `dangerouslySetInnerHTML`.
 * Supprime scripts, gestionnaires d'événements (`onerror`, `onclick`…) et
 * autres vecteurs XSS, tout en conservant la mise en forme riche courante.
 */
export const sanitizeHtml = (dirty: string | null | undefined): string => {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
};

/** Prêt à passer à `dangerouslySetInnerHTML`. */
export const safeHtml = (dirty: string | null | undefined) => ({
  __html: sanitizeHtml(dirty),
});
