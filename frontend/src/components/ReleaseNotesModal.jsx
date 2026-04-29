import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import changelogContent from '../../../CHANGELOG.md?raw'

// ── Composants Markdown personnalisés ─────────────────────────────────────────
const mdComponents = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-indigo-700 mt-8 mb-3 pb-2 border-b border-indigo-100 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-gray-700 mt-4 mb-1.5">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  code: ({ children, className }) => {
    // react-markdown v10 ne passe plus `inline` : on détecte le bloc via la classe language-XXX ou la présence de retours à la ligne
    const text = String(children ?? '')
    const isBlock = (className || '').startsWith('language-') || text.includes('\n')
    if (isBlock) {
      return <code className={className}>{children}</code>
    }
    return <code className="px-1.5 py-0.5 bg-gray-100 text-indigo-700 rounded text-[0.85em] font-mono">{children}</code>
  },
  blockquote: ({ children }) => (
    <div className="my-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-800 italic">{children}</div>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-2 py-1.5 text-gray-700">{children}</td>
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
  a: ({ href, children }) => (
    <a href={href} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">{children}</a>
  ),
}

export default function ReleaseNotesModal({ onClose }) {
  // Esc pour fermer
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-5xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span>📋</span> Notes de version
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Fermer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {changelogContent}
          </ReactMarkdown>
        </div>

      </div>
      {/* Click en dehors pour fermer */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
