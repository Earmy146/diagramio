import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow'

// Store quản lý trạng thái của React Flow Canvas
const useDiagramStore = create((set, get) => ({
  nodes: [],
  edges: [],
  diagramId: null,   // Khóa foreign cho backend db
  projectId: null,
  diagramName: 'Untitled Diagram',
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isDirty: false,    // Bật cờ để hooks lưu lại tự động
  dialect: 'MYSQL',  // MYSQL, POSTGRESQL, SQLITE
  
  
  // Set data khi load từ API
  setDiagramData: (payload) => {
    set({
      diagramId: payload.id,
      projectId: payload.projectId,
      diagramName: payload.name,
      nodes: payload.canvasState?.nodes || [],
      edges: payload.canvasState?.edges || [],
      zoomLevel: payload.zoomLevel || 1,
      panX: payload.panX || 0,
      panY: payload.panY || 0,
      dialect: payload.defaultDialect || 'MYSQL',
      isDirty: false
    })
  },

  // React Flow Handlers
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: true
    }))
  },
  
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true
    }))
  },
  
  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge({ ...connection, type: 'smoothstep' }, state.edges),
      isDirty: true
    }))
  },

  // Custom Actions
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  setName: (diagramName) => set({ diagramName, isDirty: true }),
  
  // Custom Node Actions
  addTableNode: (position) => set((state) => {
    const tableId = `tbl_${Math.random().toString(36).substr(2, 9)}`
    const newNode = {
      id: tableId,
      type: 'table',
      position: position || { x: 100, y: 100 },
      data: {
        id: tableId,
        name: 'new_table',
        displayName: 'new_table',
        color: '#6366f1',
        columns: [
          {
            id: `col_${Math.random().toString(36).substr(2, 9)}`,
            name: 'id',
            dataType: 'INTEGER',
            isPrimary: true,
            isNullable: false,
            isAutoIncrement: true,
          }
        ]
      }
    }
    return {
      nodes: [...state.nodes, newNode],
      isDirty: true
    }
  }),
  
  updateTableNode: (id, dataUpdater) => set((state) => ({
    nodes: state.nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          data: typeof dataUpdater === 'function' ? dataUpdater(node.data) : { ...node.data, ...dataUpdater }
        }
      }
      return node
    }),
    isDirty: true
  })),

  deleteTableNode: (id) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id),
    edges: state.edges.filter(e => e.source !== id && e.target !== id), // Tự động xóa mép (Edges) liên quan
    isDirty: true
  })),
  
  // Custom Edge Action for Dialog Validation
  addCustomEdge: (connectionData) => set((state) => ({
    edges: addEdge({ ...connectionData, type: 'smoothstep' }, state.edges),
    isDirty: true
  })),

  // Chuyển đổi ngôn ngữ Database & Map Type tự động
  changeDialect: (newDialect) => set((state) => {
    if (state.dialect === newDialect) return state
    
    // Tự động chuyển data type (Rất cơ bản)
    const mapType = (typeRaw, from, to) => {
      let t = (typeRaw || '').toUpperCase().trim()
      if (from === 'MYSQL' && to === 'POSTGRESQL') {
        if (t.startsWith('DATETIME')) return t.replace('DATETIME', 'TIMESTAMP')
        if (t === 'INT') return 'INTEGER'
        if (t === 'TINYINT(1)') return 'BOOLEAN'
        if (t === 'LONGTEXT') return 'TEXT'
      }
      if (from === 'POSTGRESQL' && to === 'MYSQL') {
        if (t.startsWith('TIMESTAMP')) return t.replace('TIMESTAMP', 'DATETIME')
        if (t === 'INTEGER') return 'INT'
        if (t === 'BOOLEAN') return 'TINYINT(1)'
      }
      return typeRaw
    }

    const updatedNodes = state.nodes.map(node => {
      if (node.type !== 'table') return node
      return {
        ...node,
        data: {
          ...node.data,
          columns: (node.data.columns || []).map(col => ({
            ...col,
            dataType: mapType(col.dataType, state.dialect, newDialect)
          }))
        }
      }
    })

    return { dialect: newDialect, nodes: updatedNodes, isDirty: true }
  }),

  // Trạng thái Canvas Pan/Zoom
  setViewport: (viewport) => set({
    zoomLevel: viewport.zoom,
    panX: viewport.x,
    panY: viewport.y,
    isDirty: true
  }),

  // Reset flag sau khi API auto-save xong
  clearDirtyFlag: () => set({ isDirty: false }),
}))

export default useDiagramStore
