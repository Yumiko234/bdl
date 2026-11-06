import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import QuillTableBetter from 'quill-table-better';
import 'quill/dist/quill.snow.css';
import 'quill-table-better/dist/quill-table-better.css';

// === FONT ===
const Font: any = Quill.import('formats/font');
Font.whitelist = ['times-new-roman', 'sans-serif', 'serif', 'monospace'];
Quill.register(Font, true);

// === LINE HEIGHT ===
const Parchment: any = Quill.import('parchment');
const LineHeightStyle = new Parchment.StyleAttributor('lineheight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5'],
});
Quill.register(LineHeightStyle, true);

// === TABLEAUX ===
Quill.register({ 'modules/table-better': QuillTableBetter }, true);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TOOLBAR = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: Font.whitelist }],
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ lineheight: ['1', '1.15', '1.5', '2', '2.5'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  ['table-better'],
  ['clean'],
];

/**
 * Nettoie le HTML produit par Quill 2 (getSemanticHTML) avant stockage :
 *  - retire l'élément technique <temporary> ajouté dans les tableaux,
 *  - retire les classes d'interface de l'éditeur (cellule sélectionnée/focus),
 *  - retire les paragraphes vides en fin de contenu,
 *  - transforme <p></p> en <p><br></p> (sinon les lignes vides s'effondrent à l'affichage).
 */
const cleanHtml = (html: string): string =>
  html
    .replace(/<temporary[^>]*><\/temporary>/g, '')
    .replace(/\s?ql-cell-(focused|selected)/g, '')
    .replace(/ class=""/g, '')
    .replace(/(<p[^>]*>(<br>)?<\/p>)+$/g, '')
    .replace(/(<p[^>]*>)<\/p>/g, '$1<br></p>');

export const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const lastEmitted = useRef<string>(value ?? '');
  const valueRef = useRef(value);
  const [htmlMode, setHtmlMode] = useState(false);

  onChangeRef.current = onChange;
  valueRef.current = value;

  // Remplace le contenu de l'éditeur sans déclencher onChange.
  // (setContents casse l'affichage des tableaux : on vide puis on applique le delta.)
  const loadHtml = (quill: Quill, html: string) => {
    const delta = quill.clipboard.convert({ html: html || '' });
    quill.deleteText(0, quill.getLength(), 'silent');
    quill.updateContents(delta, 'silent');
  };

  // Création / destruction de l'éditeur (recréé au retour du mode HTML).
  useEffect(() => {
    if (htmlMode || !hostRef.current) return;
    const host = hostRef.current;
    const editorEl = document.createElement('div');
    host.appendChild(editorEl);

    const quill = new Quill(editorEl, {
      theme: 'snow',
      placeholder,
      modules: {
        table: false,
        toolbar: TOOLBAR,
        'table-better': {
          language: 'fr_FR',
          menus: ['column', 'row', 'merge', 'table', 'cell', 'wrap', 'delete'],
          toolbarTable: true,
        },
        keyboard: { bindings: QuillTableBetter.keyboardBindings },
      },
    });
    quillRef.current = quill;

    loadHtml(quill, valueRef.current);
    lastEmitted.current = valueRef.current ?? '';

    quill.on('text-change', (_delta, _old, source) => {
      if (source === 'silent') return;
      const html = quill.getLength() <= 1 ? '' : cleanHtml(quill.getSemanticHTML());
      if (html === lastEmitted.current) return;
      lastEmitted.current = html;
      onChangeRef.current(html);
    });

    return () => {
      quillRef.current = null;
      host.innerHTML = ''; // retire la barre d'outils et l'éditeur (compatible StrictMode)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlMode]);

  // Valeur modifiée depuis l'extérieur (ex. ouverture d'un autre élément à éditer).
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || value === lastEmitted.current) return;
    lastEmitted.current = value ?? '';
    loadHtml(quill, value);
  }, [value]);

  return (
    <div className="rich-text-editor">
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setHtmlMode((m) => !m)}
          title={htmlMode ? "Retour à l'éditeur visuel" : 'Éditer le HTML source'}
          className={`px-2 py-0.5 text-xs font-mono border rounded transition-colors ${
            htmlMode
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
          }`}
        >
          {'<>'}
        </button>
      </div>
      {htmlMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Collez votre HTML ici…"
          className="w-full min-h-[200px] p-3 text-xs font-mono border rounded-md bg-background text-foreground resize-y"
        />
      ) : (
        <div ref={hostRef} className="bg-background text-foreground" />
      )}
    </div>
  );
};