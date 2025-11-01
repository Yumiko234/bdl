import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ---- Configuration ----
const SUPABASE_URL = "https://ppmlhjcwdyaarbqpngla.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxoamN3ZHlhYXJicXBuZ2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzExOTAsImV4cCI6MjA3NTU0NzE5MH0.PvzdJ2vdKoUG7louIArChmHkZb9I60KMTcKzhurnj6E"; // lecture seule OK
const DOMAIN = "https://bdl-saintandre.fr"; // à adapter évidemment

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSitemap() {
  // Routes statiques (issues de /src/pages)
  const staticRoutes = [
    "/", // Index
    "/actualites",
    "/admin",
    "/auth",
    "/bdl",
    "/clubs",
    "/contact",
    "/documents",
    "/events",
    "/intranet",
  ];

  // Récupération des articles du JO pour les routes dynamiques
  const { data: jobdlData, error: jobdlError } = await supabase
    .from("official_journal")
    .select("nor_number");

  if (jobdlError) {
    console.error("Erreur lors de la récupération des N.O.R. :", jobdlError);
  }

  const jobdlRoutes =
    jobdlData?.map(
      (item) =>
        `<url><loc>${DOMAIN}/jobdl/${item.nor_number}</loc><changefreq>weekly</changefreq></url>`
    ) || [];

  // Conversion des routes statiques en URLs XML
  const staticUrls = staticRoutes.map(
    (route) =>
      `<url><loc>${DOMAIN}${route}</loc><changefreq>monthly</changefreq></url>`
  );

  // Construction du sitemap XML final
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${[...staticUrls, ...jobdlRoutes].join("\n")}
  </urlset>`;

  // Écriture dans /public/sitemap.xml
  const outputPath = path.resolve("public", "sitemap.xml");
  fs.writeFileSync(outputPath, sitemap);

  console.log("✅ Sitemap global généré avec succès :", outputPath);
}

generateSitemap().catch((err) => {
  console.error("Erreur lors de la génération du sitemap :", err);
});