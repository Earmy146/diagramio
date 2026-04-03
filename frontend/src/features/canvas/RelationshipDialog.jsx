import { useState, useEffect } from 'react'
import { X, Link as LinkIcon } from 'lucide-react'
import useDiagramStore from '../../stores/useDiagramStore'

export default function RelationshipDialog({ isOpen, connection, onClose, onConfirm }) {
  const [relType, setRelType] = useState('ONE_TO_MANY')
  const [onDelete, setOnDelete] = useState('RESTRICT')
  const [onUpdate, setOnUpdate] = useState('CASCADE')
  const { nodes } = useDiagramStore()

  const [fromInfo, setFromInfo] = useState({ tableName: '', colName: '' })
  const [toInfo, setToInfo] = useState({ tableName: '', colName: '' })

  // Lấy thông tin hiển thị rành mạch
  useEffect(() => {
    if (isOpen && connection) {
      const fromNode = nodes.find(n => n.id === connection.source)
      const toNode = nodes.find(n => n.id === connection.target)
      
      const fromCol = fromNode?.data?.columns?.find(c => c.id === connection.sourceHandle || c.name === connection.sourceHandle)
      const toCol = toNode?.data?.columns?.find(c => c.id === connection.targetHandle || c.name === connection.targetHandle)

      setFromInfo({
        tableName: fromNode?.data?.name || 'Unknown',
        colName: fromCol?.name || 'Unknown'
      })

      setToInfo({
        tableName: toNode?.data?.name || 'Unknown',
        colName: toCol?.name || 'Unknown'
      })
    }
  }, [isOpen, connection, nodes])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm({ ...connection, data: { relType, onDelete, onUpdate } })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-glass rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-glass bg-white/5">
          <div className="flex items-center gap-2 text-textMain">
            <LinkIcon className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold text-lg">Tạo Liên Kết</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-textMuted hover:text-textMain hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          
          {/* Cấu trúc tham chiếu */}
          <div className="bg-background/50 rounded-xl border border-glass p-4 text-sm flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-textMuted text-xs uppercase tracking-wider">Từ Khóa Ngoại</span>
              <span className="font-medium text-primary-400">{fromInfo.tableName}.<span className="text-textMain">{fromInfo.colName}</span></span>
            </div>
            <div className="px-3 text-textMuted">⟶</div>
            <div className="flex flex-col gap-1">
              <span className="text-textMuted text-xs uppercase tracking-wider">Đến Khóa Chính</span>
              <span className="font-medium text-accent-400">{toInfo.tableName}.<span className="text-textMain">{toInfo.colName}</span></span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textMuted mb-2">Kiểu quan hệ (Relationship)</label>
              <select 
                value={relType} onChange={(e) => setRelType(e.target.value)}
                className="w-full bg-background border border-glass rounded-lg px-3 py-2.5 text-textMain text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              >
                <option value="ONE_TO_ONE">1:1 (One-to-One)</option>
                <option value="ONE_TO_MANY">1:N (One-to-Many)</option>
                <option value="MANY_TO_MANY">M:N (Many-to-Many)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textMuted mb-2">On Delete</label>
                <select 
                  value={onDelete} onChange={(e) => setOnDelete(e.target.value)}
                  className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-textMain text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="RESTRICT">RESTRICT</option>
                  <option value="CASCADE">CASCADE</option>
                  <option value="SET_NULL">SET NULL</option>
                  <option value="NO_ACTION">NO ACTION</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-textMuted mb-2">On Update</label>
                <select 
                  value={onUpdate} onChange={(e) => setOnUpdate(e.target.value)}
                  className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-textMain text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="CASCADE">CASCADE</option>
                  <option value="RESTRICT">RESTRICT</option>
                  <option value="SET_NULL">SET NULL</option>
                  <option value="NO_ACTION">NO ACTION</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-glass bg-background/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-textMain hover:bg-white/5 transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium shadow-lg shadow-primary-500/20 transition-all"
          >
            Tạo Liên Kết
          </button>
        </div>

      </div>
    </div>
  )
}
