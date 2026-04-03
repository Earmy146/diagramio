import { useCallback } from 'react'
import { useDiagramStore } from '../store/diagramStore.js'
import api from '../services/api.js'

/**
 * Hook sync SQL <-> ERD canvas
 * - sqlToErd: gọi /parser/sql-to-erd và cập nhật nodes/edges
 * - erdToSql: gọi /parser/erd-to-sql và cập nhật sql
 */
export function useSqlSync() {
  const { nodes, edges, setSql, setNodes, setEdges, dialect } = useDiagramStore()

  const sqlToErd = useCallback(async (sql) => {
    const { data } = await api.post('/parser/sql-to-erd', { sql, dialect })
    const erd = data.data
    // Convert ERD JSON → React Flow nodes/edges
    setNodes(erd.tables.map((t) => ({
      id: t.id,
      type: 'tableNode',
      position: t.position,
      data: t,
    })))
    setEdges(erd.relationships.map((r) => ({
      id: r.id,
      source: r.fromTableId,
      target: r.toTableId,
      data: r,
    })))
  }, [dialect, setNodes, setEdges])

  const erdToSql = useCallback(async () => {
    const erdJson = {
      tables: nodes.map((n) => ({ ...n.data, position: n.position })),
      relationships: edges.map((e) => e.data),
    }
    const { data } = await api.post('/parser/erd-to-sql', { erd: erdJson, dialect })
    setSql(data.data.sql)
  }, [nodes, edges, dialect, setSql])

  return { sqlToErd, erdToSql }
}
