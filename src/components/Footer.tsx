import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import logoBdl from "@/assets/logo-bdl.jpeg";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const [content, setContent] = useState<Record<string, string>>({});

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    const { data } = await supabase
      .from('footer_content')
      .select('*');
    
    if (data) {
      const contentMap: Record<string, string> = {};
      data.forEach(item => {
        contentMap[item.section_key] = item.content;
      });
      setContent(contentMap);
    }
  };

  return (
    <footer className="bg-secondary text-secondary-foreground mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img src={logoBdl} alt="Logo BDL" className="h-16 w-16 rounded-full" />
            <p 
              className="text-sm"
              dangerouslySetInnerHTML={{ 
                __html: content.about || 'Bureau des Lycéens<br />Lycée Saint-André' 
              }}
            />
            <p 
              className="text-xs italic text-accent"
              dangerouslySetInnerHTML={{ 
                __html: content.quote || '"Là où naît l\'ambition, s\'élève la grandeur."' 
              }}
            />
          </div>

          <div>
            <h3 className="font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-accent transition-colors">Accueil</Link></li>
              <li><Link to="/etablissement" className="hover:text-accent transition-colors">L'Établissement</Link></li>
              <li><Link to="/bdl" className="hover:text-accent transition-colors">Le BDL</Link></li>
              <li><Link to="/clubs" className="hover:text-accent transition-colors">Clubs</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Ressources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/actualites" className="hover:text-accent transition-colors">Actualités</Link></li>
              <li><Link to="/documents" className="hover:text-accent transition-colors">Documents</Link></li>
              <li><Link to="/events" className="hover:text-accent transition-colors">Évènements</Link></li>
              <li><Link to="/jo" className="hover:text-accent transition-colors">JoBDL</Link></li>
              <li><Link to="/scrutin" className="hover:text-accent transition-colors">Scrutins</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <p className="text-sm space-y-1">
              <span 
                className="block"
                dangerouslySetInnerHTML={{ 
                  __html: content.contact_address || 'Lycée Saint-André' 
                }}
              />
              <span 
                className="block text-muted-foreground"
                dangerouslySetInnerHTML={{ 
                  __html: content.contact_email || 'contact@bdl-saintandre.fr' 
                }}
              />
              <a 
                href="https://www.instagram.com/bdllgsaintandre"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-accent transition-colors"
              >
                Instagram — @bdllgsaintandre
              </a>
              <a 
                href="https://www.st-andre.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block text-muted-foreground hover:text-accent transition-colors"
              >
                www.st-andre.com
              </a>
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p 
            dangerouslySetInnerHTML={{ 
              __html: `&copy; ${new Date().getFullYear()} ${content.copyright || 'Bureau des Lycéens - Lycée Saint-André. Tous droits réservés.'}` 
            }}
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
