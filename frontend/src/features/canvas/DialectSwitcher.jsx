import { Database } from 'lucide-react'
import useDiagramStore from '../../stores/useDiagramStore'

const DIALECTS = [
  { id: 'MYSQL', label: 'MySQL' },
  { id: 'POSTGRESQL', label: 'PostgreSQL' },
  { id: 'SQLITE', label: 'SQLite' }
]

export default function DialectSwitcher() {
  const { dialect, changeDialect } = useDiagramStore()

  return (
    <div className="flex items-center bg-surface/80 border border-glass rounded-lg px-2 py-1 shadow-lg backdrop-blur-md">
      <Database className="w-4 h-4 text-primary-400 mr-2" />
      <select
        value={dialect}
        onChange={(e) => changeDialect(e.target.value)}
        className="bg-transparent border-none outline-none text-sm font-medium text-textMain cursor-pointer appearance-none min-w-[90px]"
      >
        {DIALECTS.map(d => (
          <option key={d.id} value={d.id} className="bg-surface text-textMain">
            {d.label}
          </option>
        ))}
      </select>
    </div>
  )
}
