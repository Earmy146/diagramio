import jwt from 'jsonwebtoken'
import { unauthorized } from '../utils/response.js'

// Bắt buộc phải login
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return unauthorized(res)
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return unauthorized(res, 'Invalid or expired token')
  }
}

// Có thể là guest, nếu có token thì gán user
export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET)
    } catch { /* tiếp tục với guest */ }
  }
  next()
}
