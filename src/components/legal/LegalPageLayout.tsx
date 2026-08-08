import { ReactNode, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { List } from "lucide-react";

export interface LegalTocEntry {
  id: string;
  label: string;
}

interface LegalPageLayoutProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  toc: LegalTocEntry[];
  children: ReactNode;
}

/**
 * Shared shell for the site's legal pages (Mentions légales, CGU,
 * Politique de confidentialité). Reuses the same institutional hero,
 * card and shadow language as the rest of the site (see Support.tsx,
 * Etablissement.tsx) so the three documents feel like one family.
 */
const LegalPageLayout = ({
  icon,
  eyebrow,
  title,
  intro,
  lastUpdated,
  toc,
  children,
}: LegalPageLayoutProps) => {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");

  useEffect(() => {
    const headings = toc
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => !!el);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toc.length]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <MaintenanceOverlay>
        <main className="flex-1">
          {/* Hero */}
          <section className="gradient-institutional text-white py-14 md:py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl shrink-0">
                    {icon}
                  </div>
                  <div className="space-y-3">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-accent">
                      {eyebrow}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                      {title}
                    </h1>
                    <p className="text-white/80 max-w-2xl leading-relaxed">
                      {intro}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-white/30 text-white/80 bg-white/5"
                    >
                      Dernière mise à jour : {lastUpdated}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Body */}
          <div className="container mx-auto px-4 py-10 md:py-14 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
              {/* Table of contents */}
              <aside className="lg:sticky lg:top-24">
                <Card className="shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
                      <List className="h-4 w-4 text-primary" />
                      Sommaire
                    </div>
                    <nav>
                      <ul className="space-y-1">
                        {toc.map((entry, index) => (
                          <li key={entry.id}>
                            <button
                              onClick={() => scrollToSection(entry.id)}
                              className={`w-full text-left text-sm rounded-md px-2.5 py-1.5 transition-colors leading-snug ${
                                activeId === entry.id
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              }`}
                            >
                              <span className="text-xs tabular-nums text-muted-foreground/70 mr-1.5">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              {entry.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </CardContent>
                </Card>
              </aside>

              {/* Document content */}
              <Card className="shadow-card">
                <CardContent className="p-6 md:p-10 space-y-12">
                  {children}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </MaintenanceOverlay>
      <Footer />
    </div>
  );
};

export default LegalPageLayout;