import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Terminal, ArrowRight, Code2 } from "lucide-react";
import { developers } from "@/data/developers";

const DevelopersHub = () => {
  const [typed, setTyped] = useState("");
  const fullText = "// équipe technique du site";

  useEffect(() => {
    document.title = "Développeurs – Bureau des Lycéens";
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, 35);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a]">
      <Navigation />

      <main className="flex-1 relative overflow-hidden">
        {/* Fond : grille + halos façon "dev mode" */}
        <div className="dev-hub-grid absolute inset-0 pointer-events-none" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <section className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-300/80 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5">
              <Terminal className="h-3.5 w-3.5" />
              Zone développeurs
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Qui a codé <span className="text-amber-400">tout ça</span> ?
            </h1>
            <p className="font-mono text-sm md:text-base text-slate-400 h-6">
              {typed}
              <span className="animate-pulse">▍</span>
            </p>
            <p className="text-slate-400 max-w-xl mx-auto pt-2">
              Le site du BDL est développé et maintenu par ces deux personnes. Choisis un profil
              pour découvrir qui se cache derrière le clavier.
            </p>
          </div>

          {/* Sélecteur — deux "dev cards" */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {developers.map((dev) => (
              <Link
                key={dev.slug}
                to={`/developpers/${dev.slug}`}
                className="dev-select-card group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 flex flex-col items-center text-center gap-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20"
                style={{ ["--dev-accent" as string]: dev.accent }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 dev-select-glow" />

                <div
                  className="relative h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-white ring-2 ring-white/10 group-hover:ring-[hsl(var(--dev-accent))] transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, hsl(${dev.accent}) 0%, rgba(255,255,255,0.08) 150%)` }}
                >
                  {dev.avatarUrl ? (
                    <img src={dev.avatarUrl} alt={dev.fullName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    dev.avatarInitials
                  )}
                </div>

                <div className="relative space-y-1">
                  <h2 className="text-xl font-bold text-white">{dev.fullName}</h2>
                  {dev.handle && (
                    <p className="font-mono text-xs text-slate-500">{dev.handle}</p>
                  )}
                  <p className="text-sm text-slate-400">{dev.role}</p>
                </div>

                <div
                  className="relative inline-flex items-center gap-1.5 text-sm font-medium mt-2 px-4 py-2 rounded-full border border-white/10 text-white/90 group-hover:text-[hsl(var(--dev-accent))] group-hover:border-[hsl(var(--dev-accent))]/40 transition-colors"
                >
                  Voir le profil
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-600 font-mono text-xs mt-16">
            <Code2 className="h-3.5 w-3.5" />
            <span>bdl-saintandre.fr/developpers</span>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .dev-hub-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
        }
        .dev-select-card {
          background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04), transparent 60%);
        }
        .dev-select-glow {
          background: radial-gradient(circle at 50% 0%, hsl(var(--dev-accent) / 0.18), transparent 70%);
        }
      `}</style>
    </div>
  );
};

export default DevelopersHub;