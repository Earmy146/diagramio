import { Router } from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as authController from '../controllers/auth.controller.js'
import {
  registerSchema,
  loginSchema,
  emailSchema,
  verifyEmailSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js'

const router = Router()

// ─── Public routes ────────────────────────────────────────────────────────────

/**
 * @route  POST /api/auth/register
 * @desc   Đăng ký tài khoản mới (chỉ email hợp lệ: Gmail, Outlook, edu...)
 * @body   { email, username, password }
 */
router.post('/register', validate(registerSchema), authController.register)

/**
 * @route  POST /api/auth/verify-email
 * @desc   Xác nhận email bằng token từ link trong mail
 * @body   { token }
 */
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail)

/**
 * @route  POST /api/auth/resend-verification
 * @desc   Gửi lại email xác nhận
 * @body   { email }
 */
router.post('/resend-verification', validate(emailSchema), authController.resendVerification)

/**
 * @route  POST /api/auth/login
 * @desc   Đăng nhập — trả access token + set refresh token cookie
 * @body   { email, password }
 */
router.post('/login', validate(loginSchema), authController.login)

/**
 * @route  POST /api/auth/refresh
 * @desc   Dùng refresh token cookie để lấy access token mới
 * @cookie diagramio_refresh
 */
router.post('/refresh', authController.refresh)

/**
 * @route  POST /api/auth/logout
 * @desc   Đăng xuất — xóa refresh token khỏi DB và cookie
 */
router.post('/logout', authController.logout)

/**
 * @route  POST /api/auth/forgot-password
 * @desc   Gửi email đặt lại mật khẩu (luôn trả 200 để tránh email enumeration)
 * @body   { email }
 */
router.post('/forgot-password', validate(emailSchema), authController.forgotPassword)

/**
 * @route  POST /api/auth/reset-password
 * @desc   Đặt lại mật khẩu bằng token từ email
 * @body   { token, newPassword }
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)

/**
 * @route  GET /api/auth/check-email?email=...
 * @desc   Kiểm tra email có thuộc domain được chấp nhận không (dùng cho UI validation)
 */
router.get('/check-email', authController.checkEmail)

// ─── Protected routes ─────────────────────────────────────────────────────────

/**
 * @route  GET /api/auth/me
 * @desc   Lấy thông tin user đang đăng nhập
 * @auth   Bearer token required
 */
router.get('/me', requireAuth, authController.getMe)

export default router
