import { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';

// === FONT ===
const Font = Quill.import('formats/font');
Font.whitelist = ['times-new-roman', 'sans-serif', 'serif', 'monospace'];
Quill.register(Font, true);

// === LINE HEIGHT ===
const Parchment = Quill.import('parchment');
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
  const [htmlMode, setHtmlMode] = useState(false);

  const modules = {
    toolbar: [
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
      ['clean']
    ]
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

  // ✅ Set default font and line-height to reflect toolbar
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      editor.format('font', 'times-new-roman');
      const currentLineHeight = editor.getFormat()?.lineheight || '1.15';
      editor.format('lineheight', currentLineHeight);
    }
  }, []);

  return (
    <div className="rich-text-editor">
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setHtmlMode((m) => !m)}
          title={htmlMode ? "Retour à l'éditeur visuel" : "Éditer le HTML source"}
          className={`px-2 py-0.5 text-xs font-mono border rounded transition-colors ${
            htmlMode
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          {"<>"}
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
    </div>
  );
};
