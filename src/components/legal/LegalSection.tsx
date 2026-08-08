import { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface LegalSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/**
 * A titled section of a legal document. `id` must match the
 * corresponding entry in the page's table of contents (LegalTocEntry).
 */
export const LegalSection = ({ id, title, children }: LegalSectionProps) => (
  <section id={id} className="scroll-mt-24 space-y-4">
    <h2 className="text-xl md:text-2xl font-bold text-foreground border-b border-border pb-3">
      {title}
    </h2>
    <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80">
      {children}
    </div>
  </section>
);

/** Highlighted note for a field the association still needs to fill in. */
export const TodoNote = ({ children }: { children: ReactNode }) => (
  <div className="flex gap-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
    <div>{children}</div>
  </div>
);

/** Highlighted note for a point that is already confirmed / compliant. */
export const CheckNote = ({ children }: { children: ReactNode }) => (
  <div className="flex gap-3 rounded-lg border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/40 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200">
    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
    <div>{children}</div>
  </div>
);
