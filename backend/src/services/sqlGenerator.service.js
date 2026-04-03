/**
 * Service chuyển đổi ERD JSON thành SQL string
 */

export const generateSqlFromErd = (erdData, dialect = 'MYSQL') => {
  const { tables = [], relationships = [] } = erdData
  let sql = ''

  const isMySQL = dialect === 'MYSQL'
  const isPostgres = dialect === 'POSTGRESQL'
  const isSqlite = dialect === 'SQLITE'

  // Map cho lookup nhanh khi cần (đặc biệt cho relations)
  const colMap = new Map()
  const tableMap = new Map()

  tables.forEach(t => {
    tableMap.set(t.id, t)
    t.columns.forEach(c => {
      colMap.set(c.id, c)
    })
  })

  // 1. Tạo CREATE TABLE statments
  tables.forEach(table => {
    sql += `CREATE TABLE ${table.name} (\n`
    
    const colStrings = []
    const pkColumns = []

    table.columns.forEach(col => {
      let colStr = `  ${col.name} `

      // Xử lý type & Auto Increment tùy database
      if (col.isAutoIncrement) {
        if (isMySQL) {
          colStr += `${col.dataType} AUTO_INCREMENT`
        } else if (isPostgres) {
          colStr += `SERIAL` 
        } else if (isSqlite) {
          colStr += `INTEGER PRIMARY KEY AUTOINCREMENT`
        } else {
          colStr += `${col.dataType} AUTO_INCREMENT`
        }
      } else {
        colStr += col.dataType
      }

      // SQLite gom chung PK vào AUTOINCREMENT dòng trên nên skip PK logic đây với SQLite
      if (col.isPrimary && !(isSqlite && col.isAutoIncrement)) {
        pkColumns.push(col.name)
      }

      if (!col.isNullable && !col.isPrimary) {
        colStr += ' NOT NULL'
      }

      if (col.isUnique) {
        colStr += ' UNIQUE'
      }

      if (col.defaultValue !== null && col.defaultValue !== undefined && col.defaultValue !== '') {
        // Kiểm tra xem là string hay là function (như CURRENT_TIMESTAMP)
        const isFunc = /^[a-zA-Z_]+\(.*\)$/.test(String(col.defaultValue))
        const isNum = !isNaN(Number(col.defaultValue))
        
        if (isFunc || isNum) {
          colStr += ` DEFAULT ${col.defaultValue}`
        } else {
          colStr += ` DEFAULT '${col.defaultValue}'`
        }
      }

      // MySQL Column Comment
      if (col.comment && isMySQL) {
        colStr += ` COMMENT '${col.comment.replace(/'/g, "''")}'`
      }

      colStrings.push(colStr)
    })

    // Xử lý PK
    if (pkColumns.length > 0 && !(isSqlite && pkColumns.length === 1 && table.columns.find(c => c.name === pkColumns[0])?.isAutoIncrement)) {
      colStrings.push(`  PRIMARY KEY (${pkColumns.join(', ')})`)
    }

    sql += colStrings.join(',\n')
    sql += '\n);\n\n'
  })

  // 2. Tạo ALTER TABLE cho relationships
  if (relationships.length > 0) {
    if (isSqlite) {
      sql = `-- Chú ý: SQLite lưu FOREIGN KEY ở trong khối CREATE TABLE.\n` + 
            `-- Đoạn mã generator hiện tại xuất foreign keys dùng ALTER TABLE (không được support trực tiếp bởi SQLite).\n\n` + sql
    }

    relationships.forEach(rel => {
      const fromTable = tableMap.get(rel.fromTableId)
      const fromCol = colMap.get(rel.fromColumnId)
      const toTable = tableMap.get(rel.toTableId)
      const toCol = colMap.get(rel.toColumnId)

      if (fromTable && fromCol && toTable && toCol) {
        let fkName = `fk_${fromTable.name}_${fromCol.name}_${toTable.name}`
        if (fkName.length > 64) fkName = fkName.substring(0, 64) // Giới hạn tên constraint

        sql += `ALTER TABLE ${fromTable.name}\n`
        sql += `  ADD CONSTRAINT ${fkName}\n`
        sql += `  FOREIGN KEY (${fromCol.name}) REFERENCES ${toTable.name} (${toCol.name})`
        
        if (rel.onDelete) sql += ` ON DELETE ${rel.onDelete}`
        if (rel.onUpdate) sql += ` ON UPDATE ${rel.onUpdate}`
        
        sql += `;\n\n`
      }
    })
  }

  return sql.trim()
}
