import { useState } from 'react'
import { fmt } from './loanSimulatorUtils'

export function NumInput({ label, value, onChange, min, max, step = 1, hint, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="number" value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min} max={max} step={step} disabled={disabled}
        className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${disabled ? 'bg-gray-50 text-gray-400' : ''}`}
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

export function AmountPctInput({ label, value, onChange, mode, onModeChange, hint, referenceAmount }) {
  const computedHint = mode === 'percent' && referenceAmount > 0 && value > 0
    ? `≈ ${fmt(referenceAmount * value / 100)}`
    : mode === 'amount' && referenceAmount > 0 && value > 0
    ? `≈ ${(value / referenceAmount * 100).toFixed(2)} %`
    : hint
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex">
        <input type="number" value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={0} step={mode === 'percent' ? 0.1 : 500}
          className="flex-1 border border-r-0 border-gray-300 rounded-l-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:z-10"
        />
        <div className="flex border border-gray-300 rounded-r-md overflow-hidden text-xs shrink-0">
          <button onClick={() => onModeChange('amount')}
            className={`px-2.5 transition ${mode === 'amount' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>€</button>
          <button onClick={() => onModeChange('percent')}
            className={`px-2.5 border-l border-gray-300 transition ${mode === 'percent' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>%</button>
        </div>
      </div>
      {computedHint && <p className="text-xs text-gray-400 mt-0.5">{computedHint}</p>}
    </div>
  )
}

export function Section({ title, children, collapsible = false, defaultOpen = true, accent = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const base      = accent ? 'bg-indigo-50 rounded-xl border border-indigo-100 p-5' : 'bg-white rounded-xl shadow-sm border border-gray-100 p-5'
  const titleClass = accent ? 'text-sm font-semibold text-indigo-700 uppercase tracking-wide' : 'text-sm font-semibold text-gray-500 uppercase tracking-wide'
  return (
    <div className={base}>
      {collapsible
        ? <button onClick={() => setOpen(v => !v)} className={`flex items-center justify-between w-full ${titleClass}`}>
            {title}<span className={accent ? 'text-indigo-400' : 'text-gray-400'}>{open ? '▲' : '▼'}</span>
          </button>
        : <h2 className={titleClass}>{title}</h2>}
      {(!collapsible || open) && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  )
}

export function PropertyTypeToggle({ value, onChange }) {
  return (
    <div className="flex border border-gray-300 rounded-md overflow-hidden text-sm w-full">
      {[{ v: 'ancien', label: 'Ancien' }, { v: 'neuf', label: 'Neuf' }, { v: 'vefa', label: 'VEFA' }].map(({ v, label }) => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex-1 py-1.5 transition ${value === v ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>{label}</button>
      ))}
    </div>
  )
}
