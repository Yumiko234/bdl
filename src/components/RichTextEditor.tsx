import { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';

const Parchment = Quill.import('parchment');

// === FONT ===
const Font = Quill.import('formats/font');
Font.whitelist = ['times-new-roman', 'sans-serif', 'serif', 'monospace'];
Quill.register(Font, true);

// === LINE HEIGHT ===
const LineHeightStyle = new Parchment.Attributor.Style('lineheight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5']
});
Quill.register(LineHeightStyle, true);

// === NO COLLAPSE ===
const NoCollapseClass = new Parchment.Attributor.Class('nocollapse', 'no-collapse', {
  scope: Parchment.Scope.BLOCK,
});
Quill.register(NoCollapseClass, true);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': Font.whitelist }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'lineheight': ['1', '1.15', '1.5', '2', '2.5'] }],
        ['bold', 'italic', 'underline', 'strike'],
        // AJOUT DU BOUTON PERSONNALISÉ ICI
        [{ 'nocollapse': [true] }], 
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        // Logique pour basculer la classe
        'nocollapse': function(value: boolean) {
          const quill = (this as any).quill;
          const currentFormat = quill.getFormat();
          // Si déjà activé, on retire, sinon on applique
          quill.format('nocollapse', currentFormat.nocollapse ? false : 'true');
        }
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
    'link', 'image',
    'nocollapse' // Ne pas oublier de déclarer le format
  ];

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      editor.format('font', 'times-new-roman');
      const currentLineHeight = editor.getFormat()?.lineheight || '1.15';
      editor.format('lineheight', currentLineHeight);
      
      // Personnalisation de l'icône du bouton dans le DOM
      const noCollapseBtn = document.querySelector('.ql-nocollapse');
      if (noCollapseBtn) {
        noCollapseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        (noCollapseBtn as HTMLElement).title = "Forcer la visibilité (hors-pliage)";
      }
    }
  }, []);

  return (
    <div className="rich-text-editor">
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
    </div>
  );
};
