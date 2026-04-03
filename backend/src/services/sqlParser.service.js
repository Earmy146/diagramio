// Removed frontend dependency import to avoid path issues in backend.
// We'll implement nanoid manually here since frontend util import might fail in node if paths aren't shared via monorepo.
import { nanoid } from 'nanoid'

import pkg from 'node-sql-parser'
const { Parser } = pkg

// Helper functions for IDs
const makeTableId = () => `tbl_${nanoid(8)}`
const makeColId = () => `col_${nanoid(8)}`
const makeRelId = () => `rel_${nanoid(8)}`

const getLineText = (text, lineNumber) => {
  if (!lineNumber || lineNumber < 1) return ''
  return text.split(/\r?\n/)[lineNumber - 1] || ''
}

const replaceBareType = (text, typeName, replacement) => {
  const typeRegex = new RegExp(`(?<!['"])\\b${typeName}\\b(?!['"])`, 'gi')
  return text.replace(typeRegex, replacement)
}

const collapseNestedEnumWrappers = (text) => {
  let normalized = text
  let prev = ''

  while (normalized !== prev) {
    prev = normalized
    normalized = normalized.replace(/ENUM\('ENUM\('([^']+)'\)'\)/gi, "ENUM('$1')")
  }

  return normalized
}

const formatParserError = (sqlText, err) => {
  const line = err?.location?.start?.line
  const column = err?.location?.start?.column

  if (!line || !column) {
    return `Loi cu phap SQL: ${err.message}`
  }

  const lineText = getLineText(sqlText, line)
  const pointer = `${' '.repeat(Math.max(column - 1, 0))}^`

  return [
    `Loi cu phap SQL tai dong ${line}, cot ${column}: ${err.message}`,
    lineText,
    pointer
  ].join('\n')
}

/**
 * Helper lấy string từ AST value
 */
const getRawValue = (valObj) => {
  if (!valObj) return null
  if (typeof valObj === 'string') return valObj
  if (valObj.type === 'origin' || valObj.type === 'string' || valObj.type === 'number') return String(valObj.value)
  if (valObj.type === 'function') return `${valObj.name}()`
  return String(valObj.value)
}

/**
 * Chuyển đổi SQL thành ERD JSON
 */
export const parseSqlToErd = (sqlText, dialect = 'MYSQL') => {
  const parser = new Parser()
  let ast

  // PRE-PROCESSING STEP (SANITIZATION)
  // node-sql-parser often fails on advanced PG objects like extensions, triggers, functions, index, comments
  let cleanSql = sqlText.replace(/--.*$/gm, '') // Xóa comment inline
  cleanSql = cleanSql.replace(/CREATE EXTENSION.*?;/gi, '')
  cleanSql = cleanSql.replace(/COMMENT ON.*?;/gi, '')
  cleanSql = cleanSql.replace(/CREATE (UNIQUE )?INDEX.*?;/gi, '')
  cleanSql = cleanSql.replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/gi, '')
  cleanSql = cleanSql.replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$ LANGUAGE plpgsql;/gi, '')
  cleanSql = cleanSql.replace(/CREATE TRIGGER[\s\S]*?EXECUTE FUNCTION.*?;/gi, '')
  cleanSql = cleanSql.replace(/INSERT INTO[\s\S]*?\);/gi, '')

  // Identify Custom Types (ENUMs) to map them safely
  const customTypes = []
  const typeRegex = /CREATE TYPE\s+(\w+)\s+AS\s+ENUM\s*\([\s\S]*?\);/gi
  let match
  while ((match = typeRegex.exec(cleanSql)) !== null) {
    customTypes.push(match[1]) // 'user_role', 'camera_status', etc.
  }
  cleanSql = cleanSql.replace(typeRegex, '')

  // Thay thế các type đặc thù của PG thành type chuẩn để parser đi lọt
  // Trick: Đưa vào ENUM('__original_type_name__') để giữ lại tên gốc hiển thị ERD
  customTypes.forEach(customType => {
      cleanSql = replaceBareType(cleanSql, customType, `ENUM('${customType}')`)
  })

  // Thay thế thêm một số Data Type lạ của PG mà node-sql-parser không hiểu
  cleanSql = cleanSql.replace(/(?<!['"])vector\(\d+\)(?!['"])/gi, "ENUM('vector')")
  cleanSql = replaceBareType(cleanSql, 'INET', "ENUM('INET')")
  cleanSql = replaceBareType(cleanSql, 'MACADDR', "ENUM('MACADDR')")
  cleanSql = replaceBareType(cleanSql, 'TIMESTAMPTZ', 'TIMESTAMP')
  cleanSql = replaceBareType(cleanSql, 'BIGSERIAL', 'BIGINT AUTO_INCREMENT') // node-sql-parser prefers mysql-like
  cleanSql = replaceBareType(cleanSql, 'UUID', "ENUM('UUID')")
  cleanSql = replaceBareType(cleanSql, 'JSONB', 'JSON')
  cleanSql = collapseNestedEnumWrappers(cleanSql)

  // Xoá bỏ các Type Cast đặc thủ của PostgreSQL như: DEFAULT '{}'::jsonb => DEFAULT '{}'
  // Parser sẽ báo lỗi ':' found nếu để nguyên
  cleanSql = cleanSql.replace(/::\w+/gi, '')

  if (process.env.SQL_PARSER_DEBUG === 'true') {
    import('fs')
      .then(fs => fs.writeFileSync('debug_cleansql.sql', cleanSql))
      .catch(() => {})
  }

  try {
    // Luôn luôn parse dưới mode MySQL vì mode này của parser ổn định nhất và dễ xử lý nhất
    ast = parser.astify(cleanSql, { database: 'MySQL' })
  } catch (err) {
    throw new Error(formatParserError(cleanSql, err))
  }

  // Astify có thể trả về array hoặc object đơn
  const statements = Array.isArray(ast) ? ast : [ast]

  const tables = []
  const relationships = []
  
  // Ánh xạ tên bảng -> obj bảng
  const tableMap = new Map()
  // Ánh xạ `table.column` -> obj cột để xử lý foreign key
  const columnMap = new Map()

  // --- Pass 1: Parse các bảng và cột ---
  for (const stmt of statements) {
    if (stmt.type === 'create' && stmt.keyword === 'table') {
      const tName = stmt.table[0].table
      
      const newTable = {
        id: makeTableId(),
        name: tName,
        displayName: tName,
        color: '#6366f1',
        position: { x: (tables.length * 250) % 1000, y: Math.floor((tables.length * 250) / 1000) * 300 },
        columns: []
      }

      tableMap.set(tName, newTable)
      tables.push(newTable)

      if (stmt.create_definitions) {
        for (const def of stmt.create_definitions) {
          if (def.resource === 'column') {
            const colName = def.column.column
            
            // Lấy dataType gốc
            let dType = def.definition?.dataType || 'VARCHAR'
            
            // Phục hồi lại Type gốc (PG) nếu chúng ta đã cheat nó bằng ENUM('type_name')
            if (dType.toUpperCase() === 'ENUM' && def.definition?.expr && def.definition.expr.length === 1) {
              dType = String(def.definition.expr[0].value)
            } else if (def.definition?.length) {
              dType += `(${def.definition.length})`
            }

            const isPrimary = !!def.primary_key
            const isAutoIncrement = !!def.auto_increment
            const isNullable = def.nullable !== false
            const isUnique = def.unique_or_primary === 'unique'

            let defaultValue = null
            if (def.default_val) defaultValue = getRawValue(def.default_val.value)

            const newCol = {
              id: makeColId(),
              name: colName,
              dataType: dType.toUpperCase(),
              isPrimary,
              isAutoIncrement,
              isNullable: !isPrimary && isNullable,
              isUnique,
              isForeign: false,
              defaultValue,
              comment: def.comment ? getRawValue(def.comment) : ''
            }

            newTable.columns.push(newCol)
            columnMap.set(`${tName}.${colName}`, newCol)
          } 
          else if (def.resource === 'constraint' && def.constraint_type === 'primary key') {
            // Xử lý PRIMARY KEY (column1, column2)
            const pkCols = def.definition || []
            for (const c of pkCols) {
              const colName = c.column
              const col = newTable.columns.find(x => x.name === colName)
              if (col) {
                col.isPrimary = true
                col.isNullable = false
              }
            }
          }
        }
      }
    }
  }

  // --- Pass 2: Parse Foreign Keys ---
  for (const stmt of statements) {
    if (stmt.type === 'create' && stmt.keyword === 'table') {
      const fromTableName = stmt.table[0].table
      const fromTable = tableMap.get(fromTableName)

      if (stmt.create_definitions && fromTable) {
        for (const def of stmt.create_definitions) {
          if (def.resource === 'constraint' && def.reference_definition) {
            // FOREIGN KEY (user_id) REFERENCES users (id)
            const refDef = def.reference_definition
            const toTableName = refDef.table[0].table
            const toTable = tableMap.get(toTableName)

            // Foreign keys có thể map 1 hoặc nhiều columns, ở đây làm simple là 1 col đầu
            const fromColName = def.definition[0]?.column
            const toColName = refDef.definition[0]?.column

            if (fromColName && toColName && toTable) {
              const fromCol = fromTable.columns.find(c => c.name === fromColName)
              const toCol = toTable.columns.find(c => c.name === toColName)

              if (fromCol && toCol) {
                fromCol.isForeign = true

                // Tìm on delete/update
                let onDelete = 'RESTRICT'
                let onUpdate = 'CASCADE'

                if (refDef.on_action) {
                  for (const action of refDef.on_action) {
                    if (action.type === 'on delete') onDelete = getRawValue(action.value).toUpperCase()
                    if (action.type === 'on update') onUpdate = getRawValue(action.value).toUpperCase()
                  }
                }

                relationships.push({
                  id: makeRelId(),
                  fromTableId: fromTable.id,
                  fromColumnId: fromCol.id,
                  toTableId: toTable.id,
                  toColumnId: toCol.id,
                  type: 'ONE_TO_MANY',  // Default map
                  onDelete,
                  onUpdate,
                  label: ''
                })
              }
            }
          }
        }
      }
    }
    else if (stmt.type === 'alter' && stmt.table && stmt.table[0]) {
      // Xử lý ALTER TABLE ADD CONSTRAINT
      const fromTableName = stmt.table[0].table
      const fromTable = tableMap.get(fromTableName)

      if (fromTable && stmt.expr) {
        for (const exp of stmt.expr) {
          if (exp.action === 'add' && exp.create_definitions?.resource === 'constraint' && exp.create_definitions?.reference_definition) {
            
            const defs = exp.create_definitions
            const refDef = defs.reference_definition
            const toTableName = refDef.table[0].table
            const toTable = tableMap.get(toTableName)

            // Foreign keys map
            const fromColName = defs.definition && defs.definition[0]?.column
            const toColName = refDef.definition && refDef.definition[0]?.column

            if (fromColName && toColName && toTable) {
              const fromCol = fromTable.columns.find(c => c.name === fromColName)
              const toCol = toTable.columns.find(c => c.name === toColName)

              if (fromCol && toCol) {
                fromCol.isForeign = true

                // Tìm on delete/update
                let onDelete = 'RESTRICT'
                let onUpdate = 'CASCADE'

                if (refDef.on_action) {
                  for (const action of refDef.on_action) {
                    if (action.type === 'on delete') onDelete = getRawValue(action.value).toUpperCase()
                    if (action.type === 'on update') onUpdate = getRawValue(action.value).toUpperCase()
                  }
                }

                relationships.push({
                  id: makeRelId(),
                  fromTableId: fromTable.id,
                  fromColumnId: fromCol.id,
                  toTableId: toTable.id,
                  toColumnId: toCol.id,
                  type: 'ONE_TO_MANY',  // Default map
                  onDelete,
                  onUpdate,
                  label: ''
                })
              }
            }
          }
        }
      }
    }
  }

  return { tables, relationships }
}
