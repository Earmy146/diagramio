import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Database, Folder, Clock, MoreVertical, Trash2, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProjectsAPI, createProjectAPI, deleteProjectAPI } from '../api/projects.api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchProjects = async () => {
    try {
      const res = await getProjectsAPI()
      if (res.success) {
        setProjects(res.data)
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách dự án')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) {
      toast.error('Vui lòng nhập tên dự án')
      return
    }

    setCreating(true)
    try {
      const res = await createProjectAPI(newProjectName, newProjectDesc)
      if (res.success) {
        toast.success(res.message)
        setIsModalOpen(false)
        setNewProjectName('')
        setNewProjectDesc('')
        
        // Điều hướng thẳng vào Editor của diagram đầu tiên
        if (res.data.diagrams && res.data.diagrams.length > 0) {
          navigate(`/editor/${res.data.id}/${res.data.diagrams[0].id}`)
        } else {
          fetchProjects()
        }
      }
    } catch (error) {
      toast.error(error.message || 'Lỗi tạo dự án')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (confirm(`Bạn có chắc chắn muốn xóa dự án "${name}" không? Toàn bộ sơ đồ sẽ bị xóa vĩnh viễn.`)) {
      try {
        const res = await deleteProjectAPI(id)
        if (res.success) {
          toast.success('Đã xóa dự án')
          setProjects(projects.filter(p => p.id !== id))
        }
      } catch (error) {
        toast.error('Không thể xóa dự án')
      }
    }
  }

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textMain">Không gian của bạn</h1>
          <p className="text-sm text-textMuted mt-1">Quản lý các dự án thiết kế cơ sở dữ liệu.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg shadow-primary-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Tạo dự án mới
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass-panel text-center py-16 flex flex-col items-center">
          <div className="w-16 h-16 bg-surface border border-glass rounded-full flex items-center justify-center mb-4">
            <Folder className="w-8 h-8 text-textMuted" />
          </div>
          <h3 className="text-lg font-medium text-textMain">Chưa có dự án nào</h3>
          <p className="text-sm text-textMuted mt-2 max-w-sm mb-6">Hãy tạo dự án đầu tiên để trải nghiệm thiết kế ERD chuyên nghiệp chuyên biệt bằng mã SQL.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-glass hover:bg-white/5 text-textMain rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Bắt đầu ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="glass-panel group relative flex flex-col overflow-hidden hover:border-primary-500/50 hover:shadow-primary-500/10 hover:shadow-xl transition-all"
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center border border-primary-500/20">
                    <Database className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => handleDelete(project.id, project.name)}
                      className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-textMain line-clamp-1">{project.name}</h3>
                <p className="text-sm text-textMuted mt-1 line-clamp-2 h-10">
                  {project.description || "Chưa có mô tả..."}
                </p>
                
                <div className="mt-4 flex items-center gap-2 text-xs text-textMuted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Cập nhật: {new Date(project.updatedAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {/* Botton action */}
              <div className="px-5 py-3 border-t border-glass bg-black/10 flex items-center justify-between">
                <span className="text-xs font-medium px-2 py-1 bg-surface border border-glass rounded-md text-textMuted">
                  {project._count?.diagrams || 0} sơ đồ
                </span>
                <Link 
                  to={project.diagrams && project.diagrams.length > 0 
                    ? `/editor/${project.id}/${project.diagrams[0].id}` 
                    : `/editor/${project.id}`}
                  className="text-sm font-medium text-primary-500 hover:text-primary-400 group-hover:translate-x-1 transition-transform flex items-center"
                >
                  Mở Diagram &rarr;
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modern Modal Create */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-glass flex items-center justify-between">
                <h3 className="text-lg font-bold text-textMain">Tạo dự án mới</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-textMuted hover:text-textMain hover:bg-white/5 rounded-md">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-1">Tên dự án</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      className="block w-full px-3 py-2 border border-glass rounded-lg bg-black/20 text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="VD: Hệ thống Bán Hàng"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-1">Mô tả (Tùy chọn)</label>
                    <textarea
                      rows={3}
                      className="block w-full px-3 py-2 border border-glass rounded-lg bg-black/20 text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      placeholder="Mô tả tóm tắt về dự án..."
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-surface hover:bg-white/5 border border-glass text-textMain rounded-lg transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg disabled:opacity-50 transition-all"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Xác nhận tạo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
