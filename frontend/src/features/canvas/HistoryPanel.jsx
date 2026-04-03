import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, Clock, ChevronRight, X, RotateCcw, Plus, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getVersionsAPI, createVersionAPI, getVersionDetailAPI } from '../../api/versions.api'
import useDiagramStore from '../../stores/useDiagramStore'

export default function HistoryPanel({ projectId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const { nodes, edges, setNodes, setEdges } = useDiagramStore()

  const fetchVersions = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await getVersionsAPI(projectId)
      if (res.success) setVersions(res.data)
    } catch (err) {
      toast.error('Không thể tải lịch sử phiên bản')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const handleOpen = () => {
    setIsOpen(true)
    fetchVersions()
  }

  const handleSaveVersion = async () => {
    if (!projectId) return
    setSaving(true)
    try {
      const snapshot = { nodes, edges }
      const res = await createVersionAPI(projectId, snapshot, message || undefined)
      if (res.success) {
        toast.success(`Đã lưu: ${res.data.message}`)
        setMessage('')
        fetchVersions()
      }
    } catch (err) {
      toast.error(err.message || 'Lưu phiên bản thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreVersion = async (versionId, versionNumber) => {
    if (!confirm(`Khôi phục về phiên bản #${versionNumber}? Canvas sẽ được ghi đè bằng trạng thái cũ.`)) return
    try {
      const res = await getVersionDetailAPI(versionId)
      if (res.success) {
        const { snapshot } = res.data
        if (snapshot?.nodes) setNodes(snapshot.nodes)
        if (snapshot?.edges) setEdges(snapshot.edges)
        toast.success(`Đã khôi phục phiên bản #${versionNumber}`)
        setIsOpen(false)
      }
    } catch (err) {
      toast.error('Không thể khôi phục phiên bản này')
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-white/5 border border-glass text-textMain rounded-md transition-all text-sm font-medium"
        title="Lịch sử phiên bản"
      >
        <History className="w-4 h-4" />
        History
      </button>

      {/* Slide-over Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[45] bg-black/40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-80 bg-surface/95 backdrop-blur-xl border-l border-glass shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="h-14 border-b border-glass px-4 flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-textMain flex items-center gap-2">
                  <History className="w-4 h-4 text-primary-500" /> Lịch sử thay đổi
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-1 text-textMuted hover:text-textMain hover:bg-white/10 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Save current state */}
              <div className="p-3 border-b border-glass flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Mô tả thay đổi (tùy chọn)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveVersion()}
                    className="flex-1 px-2 py-1.5 border border-glass bg-black/20 text-textMain text-sm rounded-lg placeholder-textMuted focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleSaveVersion}
                    disabled={saving}
                    className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Lưu phiên bản hiện tại"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Versions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-10 text-textMuted">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Chưa có phiên bản nào được lưu</p>
                    <p className="text-xs mt-1 opacity-70">Bấm lưu để tạo snapshot đầu tiên</p>
                  </div>
                ) : (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className="group flex items-center justify-between p-3 rounded-xl border border-glass bg-black/10 hover:bg-primary-500/5 hover:border-primary-500/30 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-textMain truncate">{v.message}</p>
                        <p className="text-xs text-textMuted flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDate(v.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreVersion(v.id, v.versionNumber)}
                        className="ml-2 flex-shrink-0 p-1.5 text-textMuted hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Khôi phục phiên bản này"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
