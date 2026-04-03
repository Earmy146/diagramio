import { parseSqlToErd } from '../services/sqlParser.service.js'
import { generateSqlFromErd } from '../services/sqlGenerator.service.js'
import { ok, fail } from '../utils/response.js'

export const parseSql = async (req, res, next) => {
  try {
    const { sql, dialect = 'MYSQL' } = req.body
    
    if (!sql || typeof sql !== 'string') {
      return fail(res, 'Chưa truyền bản script SQL', 400)
    }

    const erdData = parseSqlToErd(sql, dialect)
    return ok(res, erdData, 'Phân tích SQL thành công')
  } catch (err) {
    next(err)
  }
}

export const generateSql = async (req, res, next) => {
  try {
    const { erdData, dialect = 'MYSQL' } = req.body
    
    if (!erdData || !erdData.tables) {
      return fail(res, 'Dữ liệu ERD không hợp lệ', 400)
    }

    const sqlStr = generateSqlFromErd(erdData, dialect)
    return ok(res, { sql: sqlStr }, 'Tạo SQL thành công')
  } catch (err) {
    next(err)
  }
}
