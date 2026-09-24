import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Github, Linkedin, Instagram, Mail, Globe,
  Terminal, GitCommitHorizontal, Sparkles, Code2,
} from "lucide-react";
import { developers, getDeveloperBySlug } from "@/data/developers";

const socialIcons: Record<string, React.ElementType> = {
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  email: Mail,
  website: Globe,
};

const DeveloperProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const dev = getDeveloperBySlug(slug);
  const [typed, setTyped] = useState("");
  const [skillsVisible, setSkillsVisible] = useState(false);

  useEffect(() => {
    if (!dev) return;
    document.title = `${dev.fullName} – Développeur BDL`;
    setTyped("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(dev.tagline.slice(0, i));
      if (i >= dev.tagline.length) clearInterval(interval);
    }, 28);
    const t = setTimeout(() => setSkillsVisible(true), 250);
    return () => { clearInterval(interval); clearTimeout(t); };
  }, [dev]);

  if (!dev) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 px-4">
            <h1 className="text-2xl font-bold">404 — Développeur introuvable</h1>
            <p className="text-muted-foreground">Ce profil n'existe pas (encore ?).</p>
            <Link to="/developpers"><Button><ChevronLeft className="h-4 w-4 mr-2" />Retour au hub</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const accent = dev.accent;
  const others = developers.filter((d) => d.slug !== dev.slug);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f1a]" style={{ ["--dev-accent" as string]: accent }}>
      <Navigation />

      <main className="flex-1 relative overflow-hidden">
        <div className="dev-profile-grid absolute inset-0 pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[36rem] rounded-full pointer-events-none dev-hero-glow" />

        {/* Breadcrumb / retour */}
        <div className="relative container mx-auto px-4 pt-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Link to="/developpers" className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-mono">
              <ChevronLeft className="h-4 w-4" /> /developpers
            </Link>
            <div className="flex items-center gap-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  to={`/developpers/${o.slug}`}
                  className="text-xs font-mono px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-black/25 dark:hover:border-white/25 transition-colors"
                >
                  → voir {o.fullName.split(" ")[0]}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Hero */}
        <section className="relative container mx-auto px-4 pt-12 pb-16 text-center">
          <div
            className="h-32 w-32 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 ring-black/10 dark:ring-white/10 shadow-2xl"
            style={{ background: `linear-gradient(135deg, hsl(${accent}), rgba(255,255,255,0.08) 160%)` }}
          >
            {dev.avatarUrl ? (
              <img src={dev.avatarUrl} alt={dev.fullName} className="h-full w-full rounded-full object-cover" />
            ) : (
              dev.avatarInitials
            )}
          </div>

          <h1 className="mt-6 text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">{dev.fullName}</h1>
          {dev.handle && <p className="font-mono text-sm text-slate-500 mt-1">{dev.handle}</p>}
          <p className="mt-3 inline-block text-sm font-medium px-4 py-1.5 rounded-full border" style={{ color: `hsl(${accent})`, borderColor: `hsl(${accent} / 0.35)`, background: `hsl(${accent} / 0.08)` }}>
            {dev.role}
          </p>

          <p className="mt-6 font-mono text-base md:text-lg text-slate-700 dark:text-slate-300 h-7">
            {typed}<span className="animate-pulse">▍</span>
          </p>

          {dev.socials && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {Object.entries(dev.socials).map(([key, url]) => {
                const Icon = socialIcons[key] || Globe;
                const href = key === "email" ? `mailto:${url}` : url;
                return (
                  <a
                    key={key}
                    href={href}
                    target={key === "email" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-black/25 dark:hover:border-white/25 transition-colors"
                    title={key}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* Terminal boot — garde toujours le style sombre (c'est un terminal) */}
        {dev.terminalBoot && dev.terminalBoot.length > 0 && (
          <section className="relative container mx-auto px-4 pb-16">
            <div className="max-w-2xl mx-auto rounded-xl border border-white/10 bg-black/80 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                <span className="ml-2 text-xs font-mono text-slate-500 flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" /> zsh — {dev.slug}
                </span>
              </div>
              <div className="p-5 font-mono text-sm space-y-1.5">
                {dev.terminalBoot.map((line, idx) => (
                  <p key={idx} className={line.startsWith(">") ? "pl-2" : ""} style={line.startsWith(">") ? { color: `hsl(${accent})` } : { color: "#94a3b8" }}>
                    {!line.startsWith(">") && <span className="text-slate-600 mr-2">$</span>}
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bio + Skills */}
        <section className="relative container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto grid md:grid-cols-5 gap-6">
            <div className="md:col-span-3 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-8 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Code2 className="h-5 w-5" style={{ color: `hsl(${accent})` }} />
                Biographie
              </h2>
              {dev.bio.map((p, i) => (
                <p key={i} className="text-slate-600 dark:text-slate-400 leading-relaxed">{p}</p>
              ))}

              {dev.quote && (
                <div className="mt-6 rounded-lg border-l-2 pl-4 py-1 font-mono text-sm text-slate-500 italic" style={{ borderColor: `hsl(${accent})` }}>
                  {dev.quote}
                </div>
              )}
            </div>

            <div className="md:col-span-2 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-8 space-y-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: `hsl(${accent})` }} />
                {dev.skillsLabel ?? "Stack"}
              </h2>
              {dev.stack.map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-xs font-mono text-slate-500 mb-1.5">
                    <span>{skill.name}</span>
                    <span>{skill.level}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: skillsVisible ? `${skill.level}%` : "0%",
                        background: `hsl(${accent})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        {dev.timeline && dev.timeline.length > 0 && (
          <section className="relative container mx-auto px-4 pb-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                <GitCommitHorizontal className="h-5 w-5" style={{ color: `hsl(${accent})` }} />
                Parcours sur le projet
              </h2>
              <div className="relative pl-6 space-y-6 border-l border-black/10 dark:border-white/10">
                {dev.timeline.map((entry, i) => (
                  <div key={i} className="relative">
                    <span
                      className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full ring-4 ring-background"
                      style={{ background: `hsl(${accent})` }}
                    />
                    <p className="text-xs font-mono text-slate-500">{entry.date}</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{entry.title}</p>
                    {entry.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{entry.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Fun facts */}
        {dev.funFacts && dev.funFacts.length > 0 && (
          <section className="relative container mx-auto px-4 pb-24">
            <div className="max-w-2xl mx-auto rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-6">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">// fun facts</p>
              <ul className="space-y-2">
                {dev.funFacts.map((fact, i) => (
                  <li key={i} className="text-slate-600 dark:text-slate-400 text-sm flex gap-2">
                    <span style={{ color: `hsl(${accent})` }}>▸</span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <Footer />

      <style>{`
        .dev-profile-grid {
          background-image:
            linear-gradient(to right, rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.035) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at top, black 30%, transparent 75%);
        }
        .dark .dev-profile-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
        }
        .dev-hero-glow {
          background: radial-gradient(ellipse at center, hsl(${accent} / 0.12), transparent 70%);
        }
        .dark .dev-hero-glow {
          background: radial-gradient(ellipse at center, hsl(${accent} / 0.18), transparent 70%);
        }
      `}</style>
    </div>
  );
};

export default DeveloperProfile;
