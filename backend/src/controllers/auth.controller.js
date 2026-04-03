import * as authService from '../services/auth.service.js'
import { ok, created, fail } from '../utils/response.js'

const REFRESH_COOKIE = 'diagramio_refresh'

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
}

// POST /auth/register
export const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body)
    return created(res, data, 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/verify-email
export const verifyEmail = async (req, res, next) => {
  try {
    await authService.verifyEmail(req.body.token)
    return ok(res, null, 'Email đã được xác nhận thành công! Bạn có thể đăng nhập ngay.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/resend-verification
export const resendVerification = async (req, res, next) => {
  try {
    await authService.resendVerification(req.body.email)
    return ok(res, null, 'Nếu email tồn tại và chưa xác nhận, chúng tôi đã gửi lại link xác nhận.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/login
export const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body)

    // Set refresh token vào httpOnly cookie
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions)

    return ok(res, { accessToken, user }, 'Đăng nhập thành công')
  } catch (err) {
    next(err)
  }
}

// POST /auth/refresh
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE]
    const { accessToken } = await authService.refresh(refreshToken)
    return ok(res, { accessToken }, 'Token đã được làm mới')
  } catch (err) {
    next(err)
  }
}

// POST /auth/logout
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE]
    await authService.logout(refreshToken)
    res.clearCookie(REFRESH_COOKIE)
    return ok(res, null, 'Đăng xuất thành công')
  } catch (err) {
    next(err)
  }
}

// GET /auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.sub)
    return ok(res, user)
  } catch (err) {
    next(err)
  }
}

// POST /auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email)
    return ok(res, null, 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.')
  } catch (err) {
    next(err)
  }
}

// POST /auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword)
    // Thu hồi refresh token cookie
    res.clearCookie(REFRESH_COOKIE)
    return ok(res, null, 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại.')
  } catch (err) {
    next(err)
  }
}

// GET /auth/check-email?email=...  (kiểm tra email có được phép không)
export const checkEmail = async (req, res) => {
  const { email } = req.query
  if (!email) return fail(res, 'Thiếu tham số email')

  const allowed = authService.isAllowedEmail(email.toLowerCase())
  return ok(res, {
    allowed,
    message: allowed
      ? 'Email được chấp nhận'
      : 'Chỉ chấp nhận email Gmail, Outlook, Yahoo hoặc email trường học',
  })
}
