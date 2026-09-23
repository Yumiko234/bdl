import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const NavigationProgress = () => {
  const { pathname } = useLocation();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(true);
    setWidth(0);
    timers.current.push(setTimeout(() => setWidth(70), 40));
    timers.current.push(setTimeout(() => setWidth(90), 350));
    timers.current.push(
      setTimeout(() => {
        setWidth(100);
        timers.current.push(setTimeout(() => setVisible(false), 250));
      }, 600)
    );
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        className="h-full bg-primary transition-all ease-out"
        style={{ width: `${width}%`, transitionDuration: width === 0 ? "0ms" : "300ms" }}
      />
    </div>
  );
};

export default NavigationProgress;
