import { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';
import { Code } from 'lucide-react';

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
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': Font.whitelist }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'lineheight': ['1', '1.15', '1.5', '2', '2.5'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'nocollapse': [true] }], 
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        'nocollapse': function(value: boolean) {
          const quill = (this as any).quill;
          const currentFormat = quill.getFormat();
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
    'nocollapse'
  ];

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      editor.format('font', 'times-new-roman');
      const currentLineHeight = editor.getFormat()?.lineheight || '1.15';
      editor.format('lineheight', currentLineHeight);
      
      const noCollapseBtn = document.querySelector('.ql-nocollapse');
      if (noCollapseBtn) {
        noCollapseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        (noCollapseBtn as HTMLElement).title = "Forcer la visibilité (hors-pliage)";
      }
    }
  }, []);

  const toggleHtmlMode = () => {
    if (!isHtmlMode) {
      // Basculer vers le mode HTML
      setHtmlContent(value);
      setIsHtmlMode(true);
    } else {
      // Retour au mode visuel
      onChange(htmlContent);
      setIsHtmlMode(false);
    }
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value);
  };

  return (
    <div className="rich-text-editor">
      {/* Bouton pour basculer en mode HTML */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={toggleHtmlMode}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors shadow-sm"
          title={isHtmlMode ? "Retour au mode visuel" : "Mode HTML / Code source"}
        >
          <Code className="h-4 w-4" />
          {isHtmlMode ? 'Mode Visuel' : 'HTML'}
        </button>
      </div>

      {isHtmlMode ? (
        <div className="border rounded-md overflow-hidden">
          <textarea
            value={htmlContent}
            onChange={handleHtmlChange}
            className="w-full h-96 p-4 font-mono text-sm bg-gray-50 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Code HTML..."
            spellCheck={false}
          />
          <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-t">
            💡 Conseil : Ajoutez <code className="bg-gray-200 px-1 rounded">class="no-collapse"</code> sur les éléments qui doivent rester toujours visibles (hors système de pliage)
          </div>
        </div>
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

      <style>{`
        .rich-text-editor .ql-container {
          min-height: 300px;
        }
      `}</style>
    </div>
  );
};
