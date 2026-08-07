import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Remet le scroll en haut de la page a chaque changement de route.
 * A placer une seule fois, a l'interieur du <BrowserRouter>, en dehors de <Routes>.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;