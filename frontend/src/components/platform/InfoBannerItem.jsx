import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const TYPE_CONFIG = {
  ALERT: {
    bg:     'bg-red-50',
    border: 'border-red-400',
    text:   'text-red-800 dark:text-red-300',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  WARNING: {
    bg:     'bg-orange-50',
    border: 'border-orange-400',
    text:   'text-orange-800 dark:text-orange-300',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  MAINTENANCE: {
    bg:     'bg-gray-50',
    border: 'border-gray-400',
    text:   'text-gray-700',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  INFO: {
    bg:     'bg-blue-50',
    border: 'border-blue-400',
    text:   'text-blue-800 dark:text-blue-300',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  SUCCESS: {
    bg:     'bg-green-50',
    border: 'border-green-400',
    text:   'text-green-800 dark:text-green-300',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
}

export default function InfoBannerItem({ banner, onDismiss, preview = false }) {
  const cfg = TYPE_CONFIG[banner.type] ?? TYPE_CONFIG.INFO

  return (
    <div className={`w-full border-l-4 px-4 py-3 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <span className="mt-0.5">{cfg.icon}</span>

        <div className="flex-1 min-w-0">
          {banner.title && (
            <span className="font-semibold mr-2">{banner.title}</span>
          )}
          <span className="text-sm [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-black/10 [&_code]:rounded [&_code]:px-1 [&_code]:text-xs">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={['img', 'script']}
              unwrapDisallowed
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                ),
                // Remplace <p> par <span> pour rester dans un contexte inline valide
                p: ({ children }) => <span>{children} </span>,
              }}
            >
              {banner.message}
            </ReactMarkdown>
          </span>
        </div>

        {!preview && onDismiss && (
          <button
            onClick={() => onDismiss(banner.id)}
            aria-label="Fermer la bannière"
            className="shrink-0 p-1 rounded hover:bg-black/10 transition ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
