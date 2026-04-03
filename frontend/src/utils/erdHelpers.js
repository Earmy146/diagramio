import { nanoid } from 'nanoid'

/**
 * Tạo ID mới cho table/column/relationship
 */
export const createTableId = () => `tbl_${nanoid(8)}`
export const createColumnId = () => `col_${nanoid(8)}`
export const createRelationId = () => `rel_${nanoid(8)}`

/**
 * Convert ERD JSON tables sang React Flow nodes
 */
export const erdTablesToNodes = (tables = []) => {
  return tables.map((table) => ({
    id: table.id,
    type: 'tableNode',
    position: table.position || { x: 0, y: 0 },
    data: table,
  }))
}

/**
 * Convert ERD JSON relationships sang React Flow edges
 */
export const erdRelationshipsToEdges = (relationships = []) => {
  return relationships.map((rel) => ({
    id: rel.id,
    source: rel.fromTableId,
    sourceHandle: rel.fromColumnId,
    target: rel.toTableId,
    targetHandle: rel.toColumnId,
    type: 'relationshipEdge',
    data: rel,
  }))
}

/**
 * Convert React Flow nodes/edges sang ERD JSON format
 */
export const flowToErdJson = (nodes = [], edges = []) => {
  return {
    tables: nodes.map((n) => ({ ...n.data, position: n.position })),
    relationships: edges.map((e) => e.data).filter(Boolean),
  }
}
