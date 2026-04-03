import { create } from 'zustand'

/**
 * Store quản lý diagram state: nodes (tables), edges (relationships), và SQL
 */
export const useDiagramStore = create((set, get) => ({
  nodes: [],
  edges: [],
  sql: '',
  dialect: 'MYSQL',

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSql: (sql) => set({ sql }),
  setDialect: (dialect) => set({ dialect }),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
  })),
  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id),
    edges: state.edges.filter((e) => e.source !== id && e.target !== id),
  })),

  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  removeEdge: (id) => set((state) => ({ edges: state.edges.filter((e) => e.id !== id) })),

  reset: () => set({ nodes: [], edges: [], sql: '' }),
}))
