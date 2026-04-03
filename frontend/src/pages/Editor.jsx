import { useEffect, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Save, Loader2, Play, PlusSquare, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import TableNode from '../features/canvas/TableNode'
import SqlEditorPanel from '../features/canvas/SqlEditorPanel'
import ShareDialog from '../features/canvas/ShareDialog'
import HistoryPanel from '../features/canvas/HistoryPanel'
import DialectSwitcher from '../features/canvas/DialectSwitcher'
import RelationshipDialog from '../features/canvas/RelationshipDialog'
import DataTypesGuide from '../features/canvas/DataTypesGuide'
import useDiagramStore from '../stores/useDiagramStore'
import { getDiagramAPI, updateDiagramAPI } from '../api/diagrams.api'

// Define custom node types outside component to prevent re-renders
const nodeTypes = {
  table: TableNode
}

function EditorCanvas() {
  const { projectId, diagramId } = useParams()
  const reactFlowInstance = useReactFlow()
  
  const [pendingConnection, setPendingConnection] = useState(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const { 
    nodes, edges, diagramName, isDirty,
    setDiagramData, onNodesChange, onEdgesChange, onConnect, 
    setViewport, clearDirtyFlag, addTableNode, dialect, addCustomEdge
  } = useDiagramStore()

  // Load Diagram Data
  useEffect(() => {
    if (!diagramId) return

    const fetchDiagram = async () => {
      try {
        const res = await getDiagramAPI(diagramId)
        if (res.success) {
          setDiagramData(res.data)
          // Set viewport
          reactFlowInstance.setViewport({
            x: res.data.panX || 0,
            y: res.data.panY || 0,
            zoom: res.data.zoomLevel || 1
          })
        }
      } catch (error) {
        toast.error('Không thể tải sơ đồ')
      }
    }
    fetchDiagram()
  }, [diagramId, setDiagramData, reactFlowInstance])

  // Lắng nghe sự kiện Move viewport để trigger unsaved
  const onMoveEnd = useCallback((event, viewport) => {
    setViewport(viewport)
  }, [setViewport])

  // Custom Handler Nối Khóa Ngoại
  const handleConnect = useCallback((connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    const sourceCol = sourceNode?.data?.columns?.find(c => c.id === connection.sourceHandle || c.name === connection.sourceHandle)
    const targetCol = targetNode?.data?.columns?.find(c => c.id === connection.targetHandle || c.name === connection.targetHandle)

    if (sourceCol && targetCol) {
      if (sourceCol.dataType !== targetCol.dataType) {
        toast.error(`Lỗi Kiểu Dữ Liệu! ${sourceCol.dataType} không thể tham chiếu vào ${targetCol.dataType}`)
        return
      }
    } else {
      // Trường hợp nối vào target global của Table (nếu có)
      if (!sourceCol && !targetCol) return onConnect(connection)
    }

    setPendingConnection(connection)
  }, [nodes, onConnect])

  const handleConfirmConnection = (finalConnection) => {
    addCustomEdge(finalConnection)
    setPendingConnection(null)
    toast.success('Đã tạo liên kết')
  }

  // Hàm Save chủ động
  const handleSave = async () => {
    if (!isDirty || !diagramId) return
    const id = toast.loading('Đang lưu sơ đồ...')
    try {
      const payload = {
        name: diagramName,
        canvasState: { nodes, edges },
        zoomLevel: reactFlowInstance.getZoom(),
        panX: reactFlowInstance.getViewport().x,
        panY: reactFlowInstance.getViewport().y,
        defaultDialect: dialect
      }
      const res = await updateDiagramAPI(diagramId, payload)
      if (res.success) {
        toast.success('Đã lưu thành công', { id })
        clearDirtyFlag()
      }
    } catch (error) {
      toast.error('Lỗi khi lưu sơ đồ', { id })
    }
  }

  const handleAddTable = () => {
    // Generate new table at current center viewport
    const { x, y, zoom } = reactFlowInstance.getViewport()
    const centerX = -x / zoom + (window.innerWidth / 2 / zoom) - 100
    const centerY = -y / zoom + (window.innerHeight / 2 / zoom) - 150
    addTableNode({ x: centerX, y: centerY })
    toast.success('Đã thêm 1 Bảng Mới')
  }

  // Tính toán hiệu ứng Highlight khi lựa chọn node
  const selectedNodeIds = useMemo(() => nodes.filter(n => n.selected).map(n => n.id), [nodes])

  const { computedNodes, computedEdges } = useMemo(() => {
    if (selectedNodeIds.length === 0) {
      return { 
        computedNodes: nodes.map(n => ({ ...n, className: 'transition-opacity duration-300' })), 
        computedEdges: edges.map(e => ({ ...e, animated: false, style: { ...e.style, opacity: 1, strokeWidth: 1.5, transition: 'all 0.3s' } })) 
      }
    }

    const connectedNodeIds = new Set(selectedNodeIds)
    const connectedEdgeIds = new Set()

    edges.forEach(edge => {
      // Xác định edge nào dính tới node đang được chọn
      if (selectedNodeIds.includes(edge.source) || selectedNodeIds.includes(edge.target)) {
        connectedNodeIds.add(edge.source)
        connectedNodeIds.add(edge.target)
        connectedEdgeIds.add(edge.id)
      }
    })

    return {
      computedNodes: nodes.map(node => ({
        ...node,
        className: connectedNodeIds.has(node.id) 
           ? 'opacity-100 transition-opacity duration-300 drop-shadow-2xl z-50' 
           : 'opacity-20 grayscale-[50%] transition-opacity duration-300',
      })),
      computedEdges: edges.map(edge => {
        const isConnected = connectedEdgeIds.has(edge.id)
        return {
          ...edge,
          animated: isConnected,
          style: {
            ...edge.style,
            stroke: isConnected ? '#10b981' : 'var(--glass-border)', // Light up with Primary-like color
            strokeWidth: isConnected ? 2.5 : 1,
            opacity: isConnected ? 1 : 0.05,
            transition: 'all 0.3s'
          }
        }
      })
    }
  }, [nodes, edges, selectedNodeIds])

  return (
    <>
      <SqlEditorPanel />
      
      {/* Dialogs */}
      <RelationshipDialog 
        isOpen={!!pendingConnection} 
        connection={pendingConnection} 
        onClose={() => setPendingConnection(null)} 
        onConfirm={handleConfirmConnection} 
      />
      <DataTypesGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} dialect={dialect} />

      <div className="absolute top-[-56px] right-4 z-50 flex items-center gap-3">
        <button
          onClick={() => setIsGuideOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-white/5 border border-glass text-textMain rounded-md transition-all text-sm font-medium"
        >
          <BookOpen className="w-4 h-4 text-blue-400" /> Cẩm nang Type
        </button>
        <DialectSwitcher />
        <div className="w-px h-5 bg-glass mx-1"></div>
        <button 
          onClick={handleAddTable}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-white/5 border border-glass text-textMain rounded-md transition-all text-sm font-medium"
        >
          <PlusSquare className="w-4 h-4 text-green-500" /> Bảng Mới
        </button>
        <div className="w-px h-5 bg-glass mx-1"></div>
        <HistoryPanel projectId={projectId} />
        <ShareDialog projectId={projectId} />
        {isDirty && <span className="text-xs text-yellow-500 font-medium tracking-wide animate-pulse">CHƯA LƯU</span>}
        <button 
          onClick={handleSave}
          disabled={!isDirty}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface disabled:text-textMuted border border-transparent disabled:border-glass text-white rounded-md transition-all text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          Lưu lại
        </button>
      </div>

      <ReactFlow
        nodes={computedNodes}
        edges={computedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent transition-all duration-300"
        minZoom={0.2}
        maxZoom={3}
      >
        <Background color="var(--border)" gap={24} size={1} />
        <Controls 
          className="bg-surface border-glass text-textMain fill-textMain rounded-xl shadow-xl overflow-hidden [&>button]:border-glass hover:[&>button]:bg-white/5" 
          position="bottom-right" 
        />
        <MiniMap 
          className="bg-surface border-glass rounded-xl shadow-xl !border-[0.5px]" 
          nodeColor="var(--primary-500)"
          maskColor="var(--background)"
        />
      </ReactFlow>
    </>
  )
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorCanvas />
    </ReactFlowProvider>
  )
}
