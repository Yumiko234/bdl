import { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';

// === CONFIGURATION QUILL ===
const Parchment = Quill.import('parchment');

const Font = Quill.import('formats/font');
Font.whitelist = ['times-new-roman', 'sans-serif', 'serif', 'monospace'];
Quill.register(Font, true);

const LineHeightStyle = new Parchment.Attributor.Style('lineheight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5']
});
Quill.register(LineHeightStyle, true);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);
  const [showHtml, setShowHtml] = useState(false);

  // === HANDLER HTML ===
  // Cette fonction bascule l'affichage entre le WYSIWYG et le code source
  const toggleHtmlMode = () => {
    setShowHtml(!showHtml);
  };

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': Font.whitelist }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'lineheight': ['1', '1.15', '1.5', '2', '2.5'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['code-view'], // Nom de notre bouton personnalisé
        ['clean']
      ],
      handlers: {
        'code-view': toggleHtmlMode
      }
    }
  };

  const formats = [
    'header', 'font', 'size', 'lineheight',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'align',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      // Configuration par défaut
      editor.format('font', 'times-new-roman');
      const currentLineHeight = editor.getFormat()?.lineheight || '1.15';
      editor.format('lineheight', currentLineHeight);

      // Injection de l'icône HTML dans le bouton
      const htmlBtn = document.querySelector('.ql-code-view');
      if (htmlBtn) {
        htmlBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
        (htmlBtn as HTMLElement).title = "Voir le code HTML";
      }
    }
  }, []);

  return (
    <div className="rich-text-editor relative">
      {showHtml ? (
        <textarea
          className="w-full min-h-[300px] p-4 font-mono text-sm bg-slate-900 text-slate-100 rounded-b-md border border-[#ccc] focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="bg-background text-foreground"
        />
      )}
      
      {/* Petit indicateur quand on est en mode HTML */}
      {showHtml && (
        <div className="absolute top-0 right-0 m-2 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded">
          MODE HTML ACTIF
        </div>
      )}
    </div>
  );
};
