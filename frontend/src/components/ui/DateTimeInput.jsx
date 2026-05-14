import DateInput from './DateInput'

function splitDatetime(value) {
  if (!value) return { date: '', time: '00:00' }
  const [date, time = '00:00'] = value.split('T')
  return { date, time: time.slice(0, 5) }
}

/**
 * Composant DateTimeInput — combine DateInput (calendrier) + sélecteur d'heure.
 *
 * Props :
 *   value      string "YYYY-MM-DDTHH:mm" (ou "")
 *   onChange   (value: string) => void — "YYYY-MM-DDTHH:mm" ou "" si effacé
 *   required   bool
 *   className  string — classes supplémentaires sur le conteneur
 */
export default function DateTimeInput({ value = '', onChange, required, className = '' }) {
  const { date, time } = splitDatetime(value)

  function handleDate(d) {
    onChange(d ? `${d}T${time}` : '')
  }

  function handleTime(e) {
    if (date) onChange(`${date}T${e.target.value}`)
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <DateInput value={date} onChange={handleDate} required={required} />
      <input
        type="time"
        value={time}
        onChange={handleTime}
        required={required}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 hover:border-indigo-400 transition-colors"
      />
    </div>
  )
}
