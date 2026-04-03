import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import { Database, Clock, Eye, AlertTriangle, Loader2, ExternalLink } from 'lucide-react'
import { getSharedDataAPI } from '../api/export.api'
import TableNode from '../features/canvas/TableNode'

const nodeTypes = { table: TableNode }

function ShareCanvas({ nodes, edges }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      className="bg-transparent"
      minZoom={0.1}
      maxZoom={3}
    >
      <Background color="var(--border)" gap={24} size={1} />
      <Controls position="bottom-right" />
      <MiniMap className="bg-surface !border-glass rounded-xl" nodeColor="var(--primary-500)" />
    </ReactFlow>
  )
}

export default function ShareView() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading') // loading | ok | error | expired
  const [data, setData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getSharedDataAPI(token)
        if (res.success) {
          setData(res.data)
          setStatus('ok')
        }
      } catch (err) {
        if (err.statusCode === 410 || err.message?.includes('hết hạn')) {
          setStatus('expired')
        } else {
          setStatus('error')
          setErrorMsg(err.message || 'Liên kết không hợp lệ hoặc đã bị xóa')
        }
      }
    }
    fetchData()
  }, [token])

  // -- Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center animate-pulse">
            <Database className="w-6 h-6 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          <p className="text-textMuted text-sm">Đang tải sơ đồ chia sẻ...</p>
        </div>
      </div>
    )
  }

  // -- Error states
  if (status === 'error' || status === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel max-w-md w-full p-8 text-center space-y-4"
        >
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-bold text-textMain">
            {status === 'expired' ? 'Liên kết đã hết hạn' : 'Liên kết không hợp lệ'}
          </h2>
          <p className="text-textMuted text-sm">
            {status === 'expired'
              ? 'Link chia sẻ này đã quá thời hạn truy cập. Hãy liên hệ người tạo để lấy link mới.'
              : errorMsg}
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors">
            Về trang chủ
          </Link>
        </motion.div>
      </div>
    )
  }

  // -- Success: render diagram read-only
  const { project, linkInfo } = data
  
  // Lấy nodes/edges từ diagram đầu tiên trong project 
  const firstDiagram = project?.diagrams?.[0]
  const nodes = firstDiagram?.canvasState?.nodes || []
  const edges = firstDiagram?.canvasState?.edges || []

  return (
    <div className="w-screen h-screen flex flex-col bg-background font-sans overflow-hidden">
      {/* Shared View Header - Read Only Banner */}
      <header className="flex-shrink-0 h-14 border-b border-glass bg-surface/80 backdrop-blur-xl flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-textMain text-sm">{project?.name}</h1>
            <p className="text-xs text-textMuted">{project?.description || 'Không có mô tả'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-textMuted">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {linkInfo?.viewCount} lượt xem
            </span>
            {linkInfo?.expiresAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Hết hạn: {new Date(linkInfo.expiresAt).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-medium flex items-center gap-1">
            <Eye className="w-3 h-3" /> Chỉ xem
          </span>
          <Link to="/" className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300">
            <ExternalLink className="w-3.5 h-3.5" /> Tạo sơ đồ của bạn
          </Link>
        </div>
      </header>

      {/* Canvas - Read Only */}
      <main className="flex-1 relative w-full h-[calc(100vh-3.5rem)]">
        <ReactFlowProvider>
          <ShareCanvas nodes={nodes} edges={edges} />
        </ReactFlowProvider>
      </main>
    </div>
  )
}
