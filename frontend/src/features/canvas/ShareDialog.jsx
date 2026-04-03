import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, X, Copy, Link as LinkIcon, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createShareLinkAPI } from '../../api/export.api'

export default function ShareDialog({ projectId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [expiresIn, setExpiresIn] = useState(0) // 0 = never

  const handleGenerateLink = async () => {
    setLoading(true)
    try {
      const res = await createShareLinkAPI(projectId, 'VIEW', expiresIn === 0 ? null : expiresIn)
      if (res.success) {
        // Build the full frontend URL
        const generatedUrl = `${window.location.origin}/share/${res.data.token}`
        setShareLink(generatedUrl)
        toast.success('Tạo liên kết chia sẻ thành công!')
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi khi tạo link chia sẻ')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink)
    toast.success('Đã copy liên kết!')
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-white/5 border border-glass text-textMain rounded-md transition-all text-sm font-medium"
      >
        <Share2 className="w-4 h-4" /> Share
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-glass flex items-center justify-between">
                <h3 className="text-lg font-bold text-textMain flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary-500" /> Chia sẻ dự án
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-1 text-textMuted hover:text-textMain hover:bg-white/5 rounded-md">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">Quyền truy cập</label>
                  <div className="flex bg-black/20 border border-glass rounded-lg overflow-hidden flex-shrink-0">
                    <button className="flex-1 py-2 text-sm font-medium bg-primary-600 border border-transparent shadow text-white transition-all">Người xem (Read-only)</button>
                    <button disabled className="flex-1 py-2 text-sm font-medium text-textMuted opacity-50 cursor-not-allowed" title="Chứa hỗ trợ Realtime Collaboration">Cộng tác viên (Sắp ra mắt)</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">Thời gian hết hạn (Ngày)</label>
                  <select 
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-glass rounded-lg bg-black/20 text-textMain focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={0}>Không bao giờ hết hạn</option>
                    <option value={1}>1 Ngày</option>
                    <option value={7}>7 Ngày</option>
                    <option value={30}>30 Ngày</option>
                  </select>
                </div>

                {shareLink ? (
                  <div className="pt-4 border-t border-glass">
                    <p className="text-xs text-textMuted mb-2">Gửi liên kết này cho bất kỳ ai</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-black/30 border border-glass rounded-lg text-sm text-textMain truncate flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-textMuted flex-shrink-0" />
                        {shareLink}
                      </div>
                      <button onClick={handleCopy} className="p-2 border border-glass rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-glass">
                    <button 
                      onClick={handleGenerateLink}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg disabled:opacity-50 transition-all font-medium"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                      Tạo Public Link
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
