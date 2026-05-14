import { useState, useEffect, useMemo } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DOC_TREE, findFirstLeaf } from '../../docs/index.js'

// ── Icône chevron ──────────────────────────────────────────────────
function ChevronIcon({ open }) {
  return (
    <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Nœud de la barre latérale ──────────────────────────────────────
function SidebarNode({ node, selectedId, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(() => {
    if (!node.children) return false
    return node.children.some(c => c.id === selectedId || (c.children?.some(gc => gc.id === selectedId)))
  })

  useEffect(() => {
    if (node.children) {
      const hasSelected = node.children.some(
        c => c.id === selectedId || c.children?.some(gc => gc.id === selectedId)
      )
      if (hasSelected) setOpen(true)
    }
  }, [selectedId, node.children])

  if (node.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          data-testid={`doc-section-${node.id}`}
          aria-label={`${open ? 'Replier' : 'Déplier'} la section ${node.label}`}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition
            ${depth === 0 ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-600 hover:bg-gray-100'}
          `}
          style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
        >
          <span>{node.label}</span>
          <ChevronIcon open={open} />
        </button>
        {open && (
          <div className="mt-0.5">
            {node.children.map(child => (
              <SidebarNode
                key={child.id}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isSelected = node.id === selectedId
  return (
    <button
      onClick={() => onSelect(node)}
      data-testid={`doc-leaf-${node.id}`}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition
        ${isSelected
          ? 'bg-indigo-50 text-indigo-700 font-semibold'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }
      `}
      style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
    >
      {node.label}
    </button>
  )
}

// ── Helpers ────────────────────────────────────────────────────────
function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function childrenToText(children) {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(childrenToText).join('')
  if (children?.props?.children) return childrenToText(children.props.children)
  return String(children ?? '')
}

function extractH2(markdown) {
  if (!markdown) return []
  return [...markdown.matchAll(/^## (.+)$/gm)].map(m => {
    const text = m[1].trim()
    return { text, id: slugify(text) }
  })
}

// ── Composants Markdown personnalisés ─────────────────────────────
const mdComponents = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">{children}</h1>
  ),
  h2: ({ children }) => {
    const id = slugify(childrenToText(children))
    return <h2 id={id} className="text-lg font-semibold text-gray-800 mt-8 mb-3">{children}</h2>
  },
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-700 mt-5 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-700">{children}</ol>
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
  pre: ({ children }) => (
    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto mb-3">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-3 py-2 text-gray-700">{children}</td>
  ),
  blockquote: ({ children }) => {
    const text = childrenToText(children)
    const THEMES = {
      '✅': { bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-900' },
      '💡': { bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-900' },
      '⚠️': { bg: 'bg-amber-50',   border: 'border-amber-200',   color: 'text-amber-900'   },
      '❌': { bg: 'bg-red-50',     border: 'border-red-200',     color: 'text-red-900'     },
      '📷': { bg: 'bg-sky-50',     border: 'border-sky-200',     color: 'text-sky-800'     },
    }
    const icon  = Object.keys(THEMES).find(e => text.trimStart().startsWith(e)) ?? '📷'
    const theme = THEMES[icon]
    return (
      <div className={`my-3 rounded-lg ${theme.bg} border ${theme.border} px-4 py-3 text-sm ${theme.color} leading-relaxed`}>
        {children}
      </div>
    )
  },
  hr: () => <hr className="my-6 border-gray-200" />,
  a: ({ href, children }) => (
    <a href={href} className="text-indigo-600 hover:underline">{children}</a>
  ),
}

// ── Sélecteur mobile ───────────────────────────────────────────────
function MobilePageSelector({ tree, selectedId, onSelect }) {
  const [open, setOpen] = useState(false)

  function findLabel(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return n.label
      if (n.children) {
        const found = findLabel(n.children, id)
        if (found) return found
      }
    }
    return null
  }

  function renderOptions(nodes, depth = 0) {
    return nodes.flatMap(n => {
      if (n.children) {
        return [
          <option key={n.id} disabled value="" style={{ fontWeight: 'bold' }}>
            {'  '.repeat(depth)}{n.label}
          </option>,
          ...renderOptions(n.children, depth + 1),
        ]
      }
      return [
        <option key={n.id} value={n.id}>
          {'  '.repeat(depth)}{n.label}
        </option>,
      ]
    })
  }

  function handleChange(e) {
    const id = e.target.value
    function findNode(nodes) {
      for (const n of nodes) {
        if (n.id === id) return n
        if (n.children) {
          const found = findNode(n.children)
          if (found) return found
        }
      }
      return null
    }
    const node = findNode(tree)
    if (node?.load) onSelect(node)
  }

  return (
    <div className="md:hidden mb-4">
      <select
        value={selectedId || ''}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {renderOptions(tree)}
      </select>
    </div>
  )
}

function findNodeById(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNodeById(n.children, id)
      if (found) return found
    }
  }
  return null
}

// ── Page principale ────────────────────────────────────────────────
export default function DocumentationPage({ user = null }) {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('app.documentation') }, [])
  const visibleTree = useMemo(() =>
    user?.role === 'ADMIN'
      ? DOC_TREE
      : DOC_TREE.filter(n => n.id !== 'administration'),
    [user?.role]
  )

  const [selectedNode, setSelectedNode] = useState(() => {
    const savedId = sessionStorage.getItem('doc-page')
    return (savedId && findNodeById(visibleTree, savedId)) ?? findFirstLeaf(visibleTree)
  })
  const [content, setContent]           = useState(null)
  const [loading, setLoading]           = useState(false)

  useEffect(() => {
    if (!selectedNode?.load) return
    setLoading(true)
    setContent(null)
    selectedNode.load()
      .then(text => setContent(text))
      .finally(() => setLoading(false))
  }, [selectedNode])

  function handleSelect(node) {
    if (!node.load) return
    setSelectedNode(node)
    sessionStorage.setItem('doc-page', node.id)
    const el = document.getElementById('doc-content')
    if (typeof el?.scrollTo === 'function') el.scrollTo({ top: 0 })
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">Guide d'utilisation de MyFinance</p>
      </div>

      {/* Sélecteur mobile */}
      <MobilePageSelector tree={visibleTree} selectedId={selectedNode?.id} onSelect={handleSelect} />

      <div className="flex gap-6">
        {/* ── Sidebar desktop ── */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-24 space-y-3">
            {/* Navigation principale */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-0.5">
              {visibleTree.map(node => (
                <SidebarNode
                  key={node.id}
                  node={node}
                  selectedId={selectedNode?.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {/* Sur cette page */}
            {extractH2(content).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">
                  Sur cette page
                </p>
                <nav className="space-y-0.5">
                  {extractH2(content).map(({ text, id }) => (
                    <button
                      key={id}
                      onClick={() => {
                        const el = document.getElementById(id)
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition leading-snug"
                    >
                      {text}
                    </button>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </aside>

        {/* ── Contenu ── */}
        <main id="doc-content" className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 p-6 md:p-8">
          {loading && (
            <div className="flex justify-center py-16 text-gray-400 text-sm">Chargement…</div>
          )}
          {!loading && content && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {content}
            </ReactMarkdown>
          )}
        </main>
      </div>
    </div>
  )
}
