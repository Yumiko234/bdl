import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logoBdl from "@/assets/logo-bdl.jpeg";

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Accueil" },
    { path: "/etablissement", label: "L'Établissement" },
    { path: "/bdl", label: "Le BDL" },
    { path: "/clubs", label: "Clubs & Vie Scolaire" },
    { path: "/actualites", label: "Actualités" },
    { path: "/events", label: "Événements" },
    { path: "/documents", label: "Documents" },
    { path: "/jo", label: "Journal Officiel" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoBdl} alt="Logo BDL" className="h-14 w-14 object-contain rounded-full" />
            <div className="hidden md:block">
              <div className="text-lg font-semibold text-foreground">Bureau des Lycéens</div>
              <div className="text-xs text-muted-foreground">Lycée Saint-André</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="font-medium"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <Link to="/intranet">
              <Button variant="outline" className="ml-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Intranet
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <Link to="/intranet" onClick={() => setIsMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-start border-primary text-primary">
                Intranet
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
