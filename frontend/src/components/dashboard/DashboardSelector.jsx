import { useState, useRef, useEffect } from 'react'

export default function DashboardSelector({ dashboards, activeDashboardId, onSelect, onManage, onCreate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!dashboards?.length) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Onglets desktop */}
      <div className="hidden sm:flex items-center gap-1 flex-wrap">
        {dashboards.map(d => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition
              ${d.id === activeDashboardId
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {d.name}
            {d.isDefault && (
              <span className={`text-[10px] ${d.id === activeDashboardId ? 'text-indigo-200' : 'text-amber-500'}`}>★</span>
            )}
          </button>
        ))}

        <button
          onClick={onCreate}
          className="px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400
                     hover:border-indigo-400 hover:text-indigo-600 transition text-xs"
          title="Créer un tableau de bord"
        >
          +
        </button>

        <button
          onClick={onManage}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          title="Gérer les tableaux de bord"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>

      {/* Select mobile */}
      <div className="sm:hidden">
        <select
          value={activeDashboardId ?? ''}
          onChange={e => onSelect(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
        >
          {dashboards.map(d => (
            <option key={d.id} value={d.id}>{d.name}{d.isDefault ? ' ★' : ''}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
