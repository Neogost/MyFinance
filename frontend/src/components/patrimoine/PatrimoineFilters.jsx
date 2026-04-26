export default function PatrimoineFilters({
  filter,
  onFilterChange,
  showClosed,
  onShowClosedChange,
  viewMode,
  onViewModeChange,
  allCategories,
  categoryLabels,
}) {
  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      <div className="flex gap-1.5 flex-wrap">
        {allCategories.map(cat => (
          <button key={cat} onClick={() => onFilterChange(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
            }`}>
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
          <input type="checkbox" checked={showClosed} onChange={e => onShowClosedChange(e.target.checked)}
            className="accent-indigo-600" />
          Afficher les positions fermées
        </label>

        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            title="Vue grille"
            className={`px-2.5 py-1.5 text-xs transition ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('grouped')}
            title="Vue groupée"
            className={`px-2.5 py-1.5 text-xs border-l border-gray-200 transition ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
