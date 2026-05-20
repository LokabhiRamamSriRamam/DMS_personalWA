import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';

export default function MarkdownView({ body }) {
  const navigate = useNavigate();

  const components = useMemo(() => ({
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold text-slate-900 mb-4 mt-0 pb-3 border-b border-slate-100">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-slate-800 mb-3 mt-7">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-slate-700 mb-2 mt-5 uppercase tracking-wide">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="text-slate-600 mb-4 leading-relaxed text-sm">{children}</p>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-5 mb-5 space-y-2 text-slate-600 text-sm">{children}</ol>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-5 mb-5 space-y-1.5 text-slate-600 text-sm">{children}</ul>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-800">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-slate-700">{children}</em>
    ),
    blockquote: ({ children }) => (
      <div className="flex gap-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3 mb-4">
        <span className="material-symbols-outlined text-amber-500 flex-shrink-0 text-[18px] mt-0.5">tips_and_updates</span>
        <div className="text-sm text-amber-900 leading-relaxed [&_strong]:font-semibold [&_strong]:text-amber-800">
          {children}
        </div>
      </div>
    ),
    hr: () => (
      <hr className="border-slate-200 my-6" />
    ),
    a: ({ href, children }) => {
      if (href?.endsWith('.md')) {
        const slug = href.split('/').pop().replace('.md', '');
        return (
          <button
            onClick={() => navigate(`/help?topic=${slug}`)}
            className="text-[#137fec] hover:underline font-medium"
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#137fec] hover:underline">
          {children}
        </a>
      );
    },
    code: ({ children }) => (
      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">{children}</code>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-slate-50">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-slate-50 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-slate-600">{children}</td>
    ),
  }), [navigate]);

  return (
    <div className="min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
