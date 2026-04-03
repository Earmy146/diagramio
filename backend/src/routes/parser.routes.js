import { Router } from 'express'
import * as parserController from '../controllers/parser.controller.js'
import { guestSession } from '../middleware/guest.middleware.js'
import { optionalAuth } from '../middleware/auth.middleware.js'

const router = Router()

// Bật guestSession & optionalAuth để thống nhất pipeline (nếu sau này cần rate limit dựa trên auth)
const commonAccess = [optionalAuth, guestSession]

/**
 * @route  POST /api/parser/sql-to-erd
 * @desc   Phân tích SQL script thành ERD JSON format (dùng cho tính năng Import SQL)
 * @body   { sql: string, dialect: string }
 */
router.post(
  '/sql-to-erd',
  commonAccess,
  parserController.parseSql
)

/**
 * @route  POST /api/parser/erd-to-sql
 * @desc   Chuyển đổi ERD JSON thành lệnh SQL (dùng cho tính năng Export SQL)
 * @body   { erdData: {tables, relationships}, dialect: string }
 */
router.post(
  '/erd-to-sql',
  commonAccess,
  parserController.generateSql
)

export default router
