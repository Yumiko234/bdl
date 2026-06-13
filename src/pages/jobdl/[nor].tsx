import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react";
import "@/styles/journal.css";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiffPart { value: string; added?: boolean; removed?: boolean; }
interface Modification { date: string; diff: DiffPart[]; }
type SigAlign = "jo-sig-left" | "jo-sig-center" | "jo-sig-right";
interface Signatory { uid: string; role: string; name: string; date: string; align: SigAlign; }

interface JournalEntry {
  id: string;
  title: string;
  nor_number: string;
  content: string;
  publication_date: string;
  author_name: string | null;
  author_role: string | null;
  modifications?: Modification[];
  signatures?: Signatory[];
}

// ─── Helpers diff ─────────────────────────────────────────────────────────────

const escapeHTML = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const injectDiffIntoContent = (htmlContent: string, modifications: Modification[]): string => {
  if (!modifications || modifications.length === 0) return htmlContent;
  const validMods = modifications.filter((m) => Array.isArray((m as any).diff) && (m as any).diff.length > 0);
  if (validMods.length === 0) return htmlContent;

  const lastMod = validMods[validMods.length - 1];
  const dateStr = new Date(lastMod.date).toLocaleDateString("fr-FR");
  interface Token { value: string; type: "unchanged" | "added" | "removed" }
  const tokens: Token[] = lastMod.diff.map((p) => ({
    value: p.value,
    type: (p.added ? "added" : p.removed ? "removed" : "unchanged") as Token["type"],
  }));

  let tokenIdx = 0, tokenOffset = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  const collectTextNodes = (node: Node): Text[] => {
    if (node.nodeType === Node.TEXT_NODE) return [node as Text];
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const tag = (node as HTMLElement).tagName.toLowerCase();
    if (["script", "style"].includes(tag)) return [];
    return Array.from(node.childNodes).flatMap(collectTextNodes);
  };

  const processTextNode = (textNode: Text): void => {
    const originalText = textNode.textContent || "";
    if (!originalText) return;
    let remaining = originalText, annotatedHTML = "";
    while (remaining.length > 0 && tokenIdx < tokens.length) {
      const token = tokens[tokenIdx];
      if (token.type === "removed") {
        annotatedHTML += `<del class="diff-removed">${escapeHTML(token.value)}</del>`;
        tokenIdx++; continue;
      }
      const tokenRemaining = token.value.slice(tokenOffset);
      if (remaining.length <= tokenRemaining.length) {
        const chunk = remaining;
        tokenOffset += chunk.length;
        if (tokenOffset >= token.value.length) { tokenOffset = 0; tokenIdx++; }
        annotatedHTML += token.type === "added" ? `<ins class="diff-added">${escapeHTML(chunk)}</ins>` : escapeHTML(chunk);
        remaining = "";
      } else {
        const chunk = tokenRemaining;
        remaining = remaining.slice(chunk.length);
        tokenOffset = 0; tokenIdx++;
        annotatedHTML += token.type === "added" ? `<ins class="diff-added">${escapeHTML(chunk)}</ins>` : escapeHTML(chunk);
      }
    }
    if (remaining.length > 0) annotatedHTML += escapeHTML(remaining);
    const span = doc.createElement("span");
    span.innerHTML = annotatedHTML;
    textNode.parentNode?.replaceChild(span, textNode);
  };

  collectTextNodes(doc.body).forEach(processTextNode);
  const allIns = doc.body.querySelectorAll("ins.diff-added");
  if (allIns.length > 0) {
    const sup = doc.createElement("sup");
    sup.className = "diff-date";
    sup.textContent = `[${dateStr}]`;
    allIns[allIns.length - 1].insertAdjacentElement("afterend", sup);
  }
  return doc.body.innerHTML;
};

// ─── PDF Export via jsPDF (pur, sans html2canvas) ────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  president: "Le Président", presidente: "La Présidente",
  vice_president: "Le Vice-Président", vice_presidente: "La Vice-Présidente",
  secretary_general: "Le Secrétaire Général", secretary_general2: "La Secrétaire Générale",
  communication_manager: "Le Directeur de la Communauté et de la Communication",
  communication_manager2: "La Directrice de la Communauté et de la Communication",
};

const getRoleLabel = (role: string | null): string =>
  ROLE_LABELS[role || ""] || "Bureau des Lycéens";

// ── Segment de texte inline avec son style ────────────────────────────────────
interface Segment { text: string; bold: boolean; italic: boolean; }

/** Extrait récursivement les segments inline d'un nœud DOM en héritant du style parent */
const extractSegments = (node: Node, bold = false, italic = false): Segment[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || "").replace(/\s+/g, " ");
    return text ? [{ text, bold, italic }] : [];
  }
  if (!(node instanceof HTMLElement)) return [];
  const tag = node.tagName.toLowerCase();
  const isBold = bold || ["strong","b","h1","h2","h3","h4"].includes(tag);
  const isItalic = italic || ["em","i"].includes(tag);
  // ins/del : on garde le texte mais on ignore la balise (le diff est déjà aplati)
  return Array.from(node.childNodes).flatMap((c) => extractSegments(c, isBold, isItalic));
};

/** Détecte l'alignement Quill sur un élément */
const getAlign = (el: HTMLElement): "left" | "center" | "right" | "justify" => {
  if (el.classList.contains("ql-align-center")) return "center";
  if (el.classList.contains("ql-align-right"))  return "right";
  if (el.classList.contains("ql-align-justify")) return "justify";
  // style inline (Quill l'injecte parfois)
  const s = el.getAttribute("style") || "";
  if (s.includes("text-align: center") || s.includes("text-align:center")) return "center";
  if (s.includes("text-align: right")  || s.includes("text-align:right"))  return "right";
  return "left";
};

const exportToPDF = async (entry: JournalEntry, bodyHTML: string): Promise<void> => {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PAGE_W = 210, PAGE_H = 297, MX = 18, MT = 22, MB = 22, CW = PAGE_W - MX * 2;
  const BLUE = "#07419e", GRAY = "#6b7280", BLACK = "#1a1a1a";
  const LINE_H = 5.2;   // hauteur de ligne corps (mm)
  const MM_PT = 0.353;  // 1pt ≈ 0.353mm

  let y = MT;

  const setColor = (hex: string) => {
    pdf.setTextColor(parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16));
  };
  const setDraw = (hex: string) => {
    pdf.setDrawColor(parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16));
  };
  const hRule = (w = 0.4, color = BLUE) => {
    setDraw(color); pdf.setLineWidth(w); pdf.line(MX, y, PAGE_W - MX, y);
  };
  const checkPage = (need = 6) => {
    if (y + need > PAGE_H - MB) { pdf.addPage(); y = MT; }
  };

  const pubDate = new Date(entry.publication_date).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ── En-tête ──────────────────────────────────────────────────────────────
  pdf.setFontSize(7); pdf.setFont("times", "bold"); setColor(BLUE);
  pdf.text("BUREAU DES LYCÉENS — LYCÉE SAINT-ANDRÉ", MX, y);
  pdf.setFontSize(8); pdf.setFont("times", "normal"); setColor(GRAY);
  pdf.text("Journal Officiel du Bureau des Lycéens", MX, y + 3.5);
  pdf.setFontSize(8); pdf.setFont("courier", "bold"); setColor(BLUE);
  pdf.text(`NOR : ${entry.nor_number}`, PAGE_W - MX, y, { align: "right" });
  pdf.setFont("times", "normal"); setColor(GRAY);
  pdf.text(`Publié le ${pubDate}`, PAGE_W - MX, y + 3.5, { align: "right" });
  y += 8; hRule(0.6); y += 5;

  // ── Titre ────────────────────────────────────────────────────────────────
  pdf.setFontSize(16); pdf.setFont("times", "bold"); setColor(BLUE);
  for (const l of pdf.splitTextToSize(entry.title, CW)) {
    pdf.text(l, PAGE_W / 2, y, { align: "center" }); y += 7;
  }
  pdf.setFontSize(8.5); pdf.setFont("times", "italic"); setColor(GRAY);
  pdf.text(`NOR : ${entry.nor_number} — ${pubDate}`, PAGE_W / 2, y, { align: "center" });
  y += 4; hRule(0.3, "#cccccc"); y += 6;

  // ── Moteur de rendu inline : écrit une ligne de segments mixed-style ─────
  /**
   * Prend un tableau de segments et les écrit sur une ou plusieurs lignes,
   * en respectant la largeur disponible et l'alignement.
   * Gère le retour à la ligne mot par mot avec changement de fonte mid-ligne.
   */
  const renderInlineSegments = (
    segments: Segment[],
    fontSize: number,
    baseColor: string,
    align: "left" | "center" | "right" | "justify",
    indentX: number,
    availW: number,
  ) => {
    // 1. Tokeniser en mots avec leur style
    interface Word { word: string; bold: boolean; italic: boolean; }
    const words: Word[] = [];
    for (const seg of segments) {
      const parts = seg.text.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        if (/^\s+$/.test(p)) {
          // espace — on l'attache au mot précédent
          if (words.length) words[words.length - 1].word += " ";
        } else {
          words.push({ word: p, bold: seg.bold, italic: seg.italic });
        }
      }
    }

    if (!words.length) return;

    // 2. Mesure la largeur d'un mot avec sa fonte
    const measureWord = (w: Word): number => {
      const style = w.bold && w.italic ? "bolditalic" : w.bold ? "bold" : w.italic ? "italic" : "normal";
      pdf.setFontSize(fontSize);
      pdf.setFont("times", style);
      return (pdf.getStringUnitWidth(w.word) * fontSize * MM_PT);
    };

    // 3. Agréger en lignes
    interface LineWord extends Word { width: number; }
    const lineWords: LineWord[] = words.map((w) => ({ ...w, width: measureWord(w) }));
    const lines: LineWord[][] = [];
    let current: LineWord[] = [];
    let currentW = 0;

    for (const lw of lineWords) {
      const addW = lw.width;
      if (current.length > 0 && currentW + addW > availW + 0.5) {
        lines.push(current);
        current = [lw];
        currentW = addW;
      } else {
        current.push(lw);
        currentW += addW;
      }
    }
    if (current.length) lines.push(current);

    // 4. Dessiner chaque ligne
    for (const line of lines) {
      checkPage(fontSize * MM_PT * 1.6);
      const totalW = line.reduce((s, w) => s + w.width, 0);

      let startX: number;
      if (align === "center") startX = indentX + (availW - totalW) / 2;
      else if (align === "right") startX = indentX + availW - totalW;
      else startX = indentX; // left / justify

      let cx = startX;
      for (const lw of line) {
        const style = lw.bold && lw.italic ? "bolditalic" : lw.bold ? "bold" : lw.italic ? "italic" : "normal";
        pdf.setFontSize(fontSize);
        pdf.setFont("times", style);
        setColor(baseColor);
        pdf.text(lw.word, cx, y);
        cx += lw.width;
      }
      y += fontSize * MM_PT * 1.55;
    }
  };

  // ── Parcours du DOM ───────────────────────────────────────────────────────
  const wrap = document.createElement("div");
  wrap.innerHTML = bodyHTML;

  const walk = (node: Node) => {
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();

    // Titres h1–h4
    if (["h1","h2","h3","h4"].includes(tag)) {
      const lv = parseInt(tag[1]);
      const sz = [14, 12, 11, 10.5][lv - 1];
      const color = lv <= 2 ? BLUE : BLACK;
      const align = getAlign(node);
      y += lv === 1 ? 4 : 3;
      const segs = extractSegments(node, true, false);
      renderInlineSegments(segs, sz, color, align, MX, CW);
      y += 1;
      return;
    }

    // Paragraphes
    if (tag === "p") {
      const segs = extractSegments(node);
      const fullText = segs.map(s => s.text).join("").trim();
      if (!fullText) { y += 2; return; }
      const align = getAlign(node);
      renderInlineSegments(segs, 10, BLACK, align, MX, CW);
      y += 1.5;
      return;
    }

    // Listes
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === "li");
      items.forEach((li, i) => {
        const bullet = tag === "ul" ? "•" : `${i + 1}.`;
        // bullet
        pdf.setFontSize(10); pdf.setFont("times", "normal"); setColor(BLACK);
        checkPage(5);
        pdf.text(bullet, MX + 1, y);
        // contenu de la li avec formatage inline
        const segs = extractSegments(li);
        renderInlineSegments(segs, 10, BLACK, "left", MX + 6, CW - 6);
      });
      y += 1.5;
      return;
    }

    // Citation
    if (tag === "blockquote") {
      const segs = extractSegments(node);
      const startY = y;
      pdf.setFontSize(10); pdf.setFont("times", "italic"); setColor(GRAY);
      renderInlineSegments(segs, 10, GRAY, "justify", MX + 5, CW - 5);
      setDraw("#FFD700"); pdf.setLineWidth(0.8);
      pdf.line(MX + 1, startY - 1, MX + 1, y);
      y += 2;
      return;
    }

    // Séparateur
    if (tag === "hr") {
      y += 2; hRule(0.3, "#cccccc"); y += 2;
      return;
    }

    // Conteneurs génériques : descendre
    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(wrap.childNodes).forEach(walk);

  // ── Signatures ──
  if (entry.signatures && entry.signatures.length > 0) {
    y += 4; checkPage(44);
    hRule(0.8); y += 4;
    pdf.setFontSize(7); pdf.setFont("times", "bold"); setColor(BLUE);
    pdf.text("SIGNATURES", MX, y); y += 5;

    const sigs = entry.signatures;
    const cols = Math.min(sigs.length, 3);
    const colW = CW / cols;

    sigs.forEach((s, i) => {
      const col = i % cols;
      const rowY = y + Math.floor(i / cols) * 38;
      const baseX = MX + col * colW;
      const ax = s.align === "jo-sig-right" ? baseX + colW - 4
        : s.align === "jo-sig-center" ? baseX + colW / 2 : baseX;
      const ta = s.align === "jo-sig-right" ? "right"
        : s.align === "jo-sig-center" ? "center" : "left";

      pdf.setFontSize(7); pdf.setFont("times", "bold"); setColor(BLUE);
      pdf.text(s.role.toUpperCase(), ax, rowY, { align: ta as any });
      pdf.setFontSize(10); pdf.setFont("times", "bolditalic"); setColor(BLACK);
      pdf.text(s.name, ax, rowY + 5, { align: ta as any });

      const lw = Math.min(colW - 8, 45);
      const lx = s.align === "jo-sig-right" ? ax - lw
        : s.align === "jo-sig-center" ? ax - lw / 2 : ax;
      setDraw("#555555"); pdf.setLineWidth(0.5);
      pdf.line(lx, rowY + 16, lx + lw, rowY + 16);

      pdf.setFontSize(7.5); pdf.setFont("times", "italic"); setColor(GRAY);
      pdf.text(s.date, ax, rowY + 21, { align: ta as any });
    });

    y += Math.ceil(sigs.length / cols) * 38 + 2;
  }

  // ── Auteur ──
  if (entry.author_name) {
    checkPage(10); y += 4;
    setDraw("#e5e7eb"); pdf.setLineWidth(0.3); pdf.line(MX, y, PAGE_W - MX, y); y += 4;
    pdf.setFontSize(9); pdf.setFont("times", "italic"); setColor(GRAY);
    pdf.text(`${getRoleLabel(entry.author_role)} : ${entry.author_name}`, PAGE_W - MX, y, { align: "right" });
  }

  // ── Pied de page (toujours en bas) ──
  const fy = PAGE_H - 10;
  setDraw("#e5e7eb"); pdf.setLineWidth(0.3); pdf.line(MX, fy - 3, PAGE_W - MX, fy - 3);
  pdf.setFontSize(7); pdf.setFont("times", "normal"); setColor(GRAY);
  pdf.text("© Bureau des Lycéens — Lycée Saint-André", MX, fy);
  pdf.text(`${entry.nor_number} — ${pubDate}`, PAGE_W - MX, fy, { align: "right" });

  pdf.save(`NOR_${entry.nor_number.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
};


// ─── Composant ArticleContent ─────────────────────────────────────────────────

const ArticleContent = ({ entry }: { entry: JournalEntry }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    const s = new Set(collapsedSections);
    s.has(id) ? s.delete(id) : s.add(id);
    setCollapsedSections(s);
  };

  const renderCollapsibleContent = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const elements = Array.from(doc.body.childNodes);

    interface Section { id: string; title: string; level: number; htmlContent: string; children: Section[]; }
    const tree: Section[] = [];
    let currentPath: Section[] = [];

    elements.forEach((node, idx) => {
      if (node instanceof HTMLElement && ["h1","h2","h3","h4"].includes(node.tagName.toLowerCase())) {
        const level = parseInt(node.tagName.substring(1));
        const newSection: Section = { id: `section-${level}-${idx}`, title: node.textContent || "", level, htmlContent: "", children: [] };
        while (currentPath.length > 0 && currentPath[currentPath.length - 1].level >= level) currentPath.pop();
        currentPath.length === 0 ? tree.push(newSection) : currentPath[currentPath.length - 1].children.push(newSection);
        currentPath.push(newSection);
      } else {
        const target = currentPath[currentPath.length - 1];
        const html = node instanceof HTMLElement ? node.outerHTML : node.textContent || "";
        if (target) target.htmlContent += html;
        else if (html.trim()) tree.push({ id: `intro-${idx}`, title: "", level: 0, htmlContent: html, children: [] });
      }
    });

    const levelContainerStyles: Record<number, string> = {
      1: "border-l-4 border-[#FFD700] bg-blue-50/20",
      2: "border-l-4 border-blue-200",
      3: "border-l-2 border-gray-300",
      4: "border-l-2 border-gray-200",
    };
    const levelTextStyles: Record<number, string> = {
      1: "text-2xl font-bold", 2: "text-xl font-bold",
      3: "text-lg font-semibold", 4: "text-base font-medium italic",
    };

    const renderTree = (nodes: Section[]) => nodes.map((section) => {
      const isCollapsed = collapsedSections.has(section.id);
      const isHeader = section.level > 0;
      return (
        <div key={section.id} className={isHeader ? `mt-2 ${levelContainerStyles[section.level] || ""} pl-4` : "mb-2"}>
          {isHeader && (
            <button onClick={() => toggleSection(section.id)} className="flex items-center gap-2 w-full text-left hover:bg-white/50 py-1 px-2 rounded transition-all group">
              {isCollapsed
                ? <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#07419e] flex-shrink-0" />
                : <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-[#07419e] flex-shrink-0" />}
              <span className={`${levelTextStyles[section.level]} ${section.level <= 2 ? "text-[#07419e]" : "text-gray-800"}`}>
                {section.title}
              </span>
            </button>
          )}
          {!isCollapsed && (
            <div className={isHeader ? "mt-1 ml-6" : ""}>
              <div className="text-justify font-normal journal-article prose-sm max-w-none last:[&_p]:mb-0"
                dangerouslySetInnerHTML={{ __html: section.htmlContent }} />
              {section.children.length > 0 && (
                <div className="mt-1 space-y-1 font-normal">{renderTree(section.children)}</div>
              )}
            </div>
          )}
        </div>
      );
    });

    if (tree.length === 0) return <div className="journal-article font-normal" dangerouslySetInnerHTML={{ __html: content }} />;
    return <div className="space-y-1 font-normal">{renderTree(tree)}</div>;
  };

  const contentToRender = injectDiffIntoContent(entry.content, entry.modifications || []);
  return (
    <article className="text-black font-normal">
      {renderCollapsibleContent(contentToRender)}
    </article>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const JobdlArticle = () => {
  const { nor } = useParams<{ nor: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!nor) return;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("official_journal")
        .select("*")
        .eq("nor_number", nor)
        .single();
      if (error) {
        console.error("Erreur Supabase :", error);
        setError("Impossible de charger la publication officielle demandée. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter la Secrétaire Générale.");
      } else {
        setEntry(data as JournalEntry);
        document.title = `${data.title} – Bureau des Lycéens`;
      }
      setLoading(false);
    };
    fetchEntry();
  }, [nor]);

  const handleDownload = async () => {
    if (!entry) return;
    setPdfLoading(true);
    try {
      const bodyHTML = injectDiffIntoContent(entry.content, entry.modifications || []);
      await exportToPDF(entry, bodyHTML);
    } catch (err) {
      console.error("Erreur export PDF :", err);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-lg text-muted-foreground">
      Chargement de la publication officielle...
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-lg text-red-700">{error}</div>
  );
  if (!entry) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-lg text-muted-foreground">
      Aucune publication trouvée pour ce numéro NOR.
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f9] font-[Times_New_Roman]">
      <Navigation />
      <main className="flex-1 py-16">
        <MaintenanceOverlay>
          <div className="container mx-auto px-6 max-w-4xl">

            {/* ── Barre d'actions ── */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-widest text-[#07419e]">
                  Journal Officiel — Bureau des Lycéens
                </p>
                <p className="text-xs text-muted-foreground font-mono">NOR : {entry.nor_number}</p>
              </div>
              <button
                onClick={handleDownload}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#07419e] text-[#07419e] bg-white hover:bg-[#07419e] hover:text-white transition-all text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title="Télécharger en PDF"
              >
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {pdfLoading ? "Génération du PDF…" : "Télécharger PDF"}
              </button>
            </div>

            {/* ── Corps du document ── */}
            <div className="border border-[#FFD700] rounded-2xl bg-white/95 shadow-card p-10">
              <h1 className="text-4xl font-bold mb-4 text-[#07419e] text-center">{entry.title}</h1>
              <p className="text-sm text-center text-muted-foreground italic mb-6">
                NOR : {entry.nor_number} — publié le{" "}
                {new Date(entry.publication_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>

              <ArticleContent entry={entry} />

              {/* ── Bloc signatures ── */}
              {entry.signatures && entry.signatures.length > 0 && (
                <div className="jo-signatures">
                  <div className="jo-signatures-title">Signatures</div>
                  <div className="jo-signatures-grid">
                    {entry.signatures.map((s) => (
                      <div key={s.uid} className={`jo-sig-block ${s.align}`}>
                        <div className="jo-sig-role">{s.role}</div>
                        <div className="jo-sig-name">{s.name}</div>
                        <div className="jo-sig-line" />
                        <div className="jo-sig-date">{s.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entry.author_name && (
                <div className="mt-8 pt-4 border-t text-right text-sm text-gray-600 italic">
                  {getRoleLabel(entry.author_role)} : {entry.author_name}
                </div>
              )}
            </div>

          </div>
        </MaintenanceOverlay>
      </main>
      <Footer />
    </div>
  );
};

export default JobdlArticle;