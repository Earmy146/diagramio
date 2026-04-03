import { useEffect, useRef } from 'react'
import { useDiagramStore } from '../store/diagramStore.js'
import api from '../services/api.js'

/**
 * Hook tự động save diagram sau khi user dừng thao tác N giây
 * @param {string|number} diagramId
 * @param {number} delay ms (default: 2000)
 */
export function useAutoSave(diagramId, delay = 2000) {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!diagramId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await api.put(`/diagrams/${diagramId}`, { canvasState: { nodes, edges } })
      } catch (err) {
        console.error('[AutoSave] Error:', err)
      }
    }, delay)

    return () => clearTimeout(timerRef.current)
  }, [nodes, edges, diagramId, delay])
}
