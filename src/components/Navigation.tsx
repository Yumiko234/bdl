import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, User, LogOut, LayoutDashboard, Ticket } from "lucide-react";
import { useState, useEffect } from "react";
import logoBdl from "@/assets/logo-bdl.jpeg";
import GlobalBanner from "./GlobalBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [navProfile, setNavProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) { setNavProfile(null); return; }
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setNavProfile(data);
    });
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (url) setNavProfile(prev => prev ? { ...prev, avatar_url: url } : prev);
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = [
    { path: "/", label: "Accueil" },
    { path: "/etablissement", label: "L'Établissement" },
    { path: "/bdl", label: "Le BDL" },
    { path: "/scrutin", label: "Scrutins" },
    { path: "/actualites", label: "Actualités" },
    { path: "/events", label: "Événements" },
    { path: "/jo", label: "Journal Officiel" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img src={logoBdl} alt="Logo BDL" className="h-14 w-14 object-contain rounded-full" />
              <div className="hidden md:block">
                <div className="text-lg font-semibold text-foreground">Bureau des Lycéens</div>
                <div className="text-xs text-muted-foreground">Lycée Saint-André</div>
              </div>
            </Link>

            {/* Nav desktop */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button variant={location.pathname === item.path ? "default" : "ghost"} className="font-medium">
                    {item.label}
                  </Button>
                </Link>
              ))}

              {/* Connecté : avatar + dropdown | Déconnecté : bouton Intranet */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-4 rounded-full ring-2 ring-primary/30 hover:ring-primary/60 transition-all focus:outline-none">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={navProfile?.avatar_url ?? undefined} />
                        <AvatarFallback className="gradient-institutional text-white text-sm font-bold">
                          {navProfile ? getInitials(navProfile.full_name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {navProfile && (
                      <>
                        <div className="px-3 py-2">
                          <p className="text-sm font-semibold truncate">{navProfile.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/intranet")}>
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Intranet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="h-4 w-4 mr-2" /> Mon profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/support")}>
                      <Ticket className="h-4 w-4 mr-2" /> Mes tickets
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/intranet">
                  <Button variant="outline" className="ml-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    Intranet
                  </Button>
                </Link>
              )}
            </div>

            {/* Bouton menu mobile */}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>

        </div>
      </nav>
      <GlobalBanner />

      {/* Menu mobile — overlay plein écran */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-20 z-40 bg-background overflow-y-auto border-t">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsMenuOpen(false)}>
                <Button variant={location.pathname === item.path ? "default" : "ghost"} className="w-full justify-start">
                  {item.label}
                </Button>
              </Link>
            ))}

            <div className="pt-3 mt-3 border-t space-y-1">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 mb-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={navProfile?.avatar_url ?? undefined} />
                      <AvatarFallback className="gradient-institutional text-white text-xs font-bold">
                        {navProfile ? getInitials(navProfile.full_name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{navProfile?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link to="/intranet" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Intranet
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <User className="h-4 w-4" /> Mon profil
                    </Button>
                  </Link>
                  <Link to="/support" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Ticket className="h-4 w-4" /> Mes tickets
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={() => { signOut(); setIsMenuOpen(false); }}>
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </Button>
                </>
              ) : (
                <Link to="/intranet" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start border-primary text-primary">
                    Intranet
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;
