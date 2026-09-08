import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import logoBdl from "@/assets/logo-bdl.jpeg";
import { supabase } from "@/integrations/supabase/client";
import { safeHtml } from "@/lib/sanitize";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Moon, Sun } from "lucide-react";

const Footer = () => {
  const [content, setContent] = useState<Record<string, string>>({});
  const { dark, toggle } = useDarkMode();

  return (
    <footer className="bg-secondary text-secondary-foreground mt-8">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {/* Logo + contact */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <div className="flex items-center gap-2">
              <img src={logoBdl} alt="Logo BDL" className="h-10 w-10 rounded-full" />
              <p className="text-sm font-medium leading-tight">Bureau des Lycéens<br /><span className="text-xs font-normal text-muted-foreground">Lycée Saint-André</span></p>
            </div>
            <p className="text-xs italic text-accent" dangerouslySetInnerHTML={safeHtml(content.quote || '"Là où naît l\'ambition, s\'élève la grandeur."')} />
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
              <span className="block" dangerouslySetInnerHTML={safeHtml(content.contact_email || 'contact@bdl-saintandre.fr')} />
              <a href="https://www.instagram.com/bdllgsaintandre" target="_blank" rel="noopener noreferrer" className="block hover:text-accent transition-colors">@bdllgsaintandre</a>
              <a href="https://www.st-andre.com" target="_blank" rel="noopener noreferrer" className="block hover:text-accent transition-colors">www.st-andre.com</a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Navigation</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><Link to="/" className="hover:text-accent transition-colors">Accueil</Link></li>
              <li><Link to="/etablissement" className="hover:text-accent transition-colors">L'Établissement</Link></li>
              <li><Link to="/bdl" className="hover:text-accent transition-colors">Le BDL</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
              <li><Link to="/support" className="hover:text-accent transition-colors">Support</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Ressources</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><Link to="/actualites" className="hover:text-accent transition-colors">Actualités</Link></li>
              <li><Link to="/documents" className="hover:text-accent transition-colors">Documents</Link></li>
              <li><Link to="/events" className="hover:text-accent transition-colors">Évènements</Link></li>
              <li><Link to="/jo" className="hover:text-accent transition-colors">JoBDL</Link></li>
              <li><Link to="/scrutin" className="hover:text-accent transition-colors">Scrutins</Link></li>
              <li><Link to="/sondage" className="hover:text-accent transition-colors">Sondages</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Légal</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><Link to="/legal/cgu" className="hover:text-accent transition-colors">CGU</Link></li>
              <li><Link to="/legal/mentions-legales" className="hover:text-accent transition-colors">Mentions légales</Link></li>
              <li><Link to="/legal/confidentialite" className="hover:text-accent transition-colors">Confidentialité</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} {content.copyright || 'Bureau des Lycéens - Lycée Saint-André. Tous droits réservés.'}
            <span className="mx-2">—</span>
            Site géré par{" "}
            <a
              href="https://fr.linkedin.com/in/alexandre-lejal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
            >
              Alexandre Lejal
            </a>
          </p>
          <button
            onClick={toggle}
            aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:border-accent hover:text-accent transition-colors text-xs"
          >
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {dark ? "Mode clair" : "Mode sombre"}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;