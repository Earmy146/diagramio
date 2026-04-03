import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '../config/prisma.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js'
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service.js'

// ─── Email domain allowlist ───────────────────────────────────────────────────
// Chấp nhận: Gmail, Outlook/Hotmail/Live, Yahoo, iCloud
const ALLOWED_DOMAINS = new Set([
  'gmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com',
])

// Chấp nhận mọi email thuộc education domain
const EDU_SUFFIXES = [
  '.edu', '.edu.vn', '.edu.au', '.edu.sg', '.edu.my', '.edu.ph',
  '.ac.uk', '.ac.jp', '.ac.kr', '.ac.id', '.ac.th', '.ac.nz',
  '.ac.in', '.ac.za', '.ac.cn', '.ac.il',
  '.university', '.college',
]

/**
 * Kiểm tra email có thuộc domain được phép không
 * @param {string} email
 * @returns {boolean}
 */
export const isAllowedEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  if (ALLOWED_DOMAINS.has(domain)) return true
  return EDU_SUFFIXES.some((suffix) => domain.endsWith(suffix))
}

// ─── Token helpers ────────────────────────────────────────────────────────────
const generateSecureToken = () => crypto.randomBytes(48).toString('hex')

const makeError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

// ─── Auth Service ─────────────────────────────────────────────────────────────

/**
 * Đăng ký tài khoản mới
 * - Validate email domain
 * - Hash password bcrypt
 * - Gửi email xác nhận
 */
export const register = async ({ email, username, password }) => {
  const normalizedEmail = email.toLowerCase().trim()

  if (!isAllowedEmail(normalizedEmail)) {
    throw makeError(
      'Chỉ chấp nhận email từ Gmail, Outlook, Yahoo hoặc email trường học (.edu, .ac.*). Vui lòng dùng email hợp lệ.',
      400
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  let user
  try {
    user = await prisma.user.create({
      data: { email: normalizedEmail, username: username.trim(), passwordHash },
    })
  } catch (err) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0]
      throw makeError(
        field === 'email' ? 'Email này đã được sử dụng' : 'Username này đã được sử dụng',
        409
      )
    }
    throw err
  }

  // Tạo email verification token (hết hạn sau 24h)
  const token = generateSecureToken()
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  // Gửi email xác nhận (không throw nếu email lỗi — log warning)
  try {
    await sendVerificationEmail(user.email, user.username, token)
  } catch (err) {
    console.warn('[Auth] Failed to send verification email:', err.message)
  }

  return { id: user.id, email: user.email, username: user.username }
}

/**
 * Xác nhận email bằng token
 */
export const verifyEmail = async (token) => {
  const record = await prisma.emailVerification.findUnique({ where: { token } })

  if (!record) throw makeError('Token xác nhận không hợp lệ', 400)
  if (record.expiresAt < new Date()) throw makeError('Token đã hết hạn. Vui lòng yêu cầu gửi lại.', 410)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerification.delete({ where: { id: record.id } }),
  ])

  return true
}

/**
 * Gửi lại email xác nhận
 */
export const resendVerification = async (email) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  // Không tiết lộ email có tồn tại không
  if (!user) return true

  if (user.emailVerifiedAt) throw makeError('Email này đã được xác nhận rồi.', 400)

  // Xóa token cũ và tạo mới
  await prisma.emailVerification.deleteMany({ where: { userId: user.id } })

  const token = generateSecureToken()
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  try {
    await sendVerificationEmail(user.email, user.username, token)
  } catch (err) {
    console.warn('[Auth] Failed to resend verification email:', err.message)
  }

  return true
}

/**
 * Đăng nhập
 * - Kiểm tra email verified
 * - Kiểm tra password
 * - Trả access token + set refresh token
 */
export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  // Dùng thông báo chung để tránh email enumeration
  if (!user) throw makeError('Email hoặc mật khẩu không đúng', 401)

  const validPassword = await bcrypt.compare(password, user.passwordHash)
  if (!validPassword) throw makeError('Email hoặc mật khẩu không đúng', 401)

  if (!user.emailVerifiedAt) {
    throw makeError('Vui lòng xác nhận email trước khi đăng nhập. Kiểm tra hộp thư của bạn.', 403)
  }

  if (!user.isActive) {
    throw makeError('Tài khoản của bạn đã bị vô hiệu hóa. Liên hệ hỗ trợ.', 403)
  }

  const payload = { sub: user.id, email: user.email, plan: user.plan }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  // Lưu refresh token vào DB
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  }
}

/**
 * Refresh access token bằng refresh token cookie
 */
export const refresh = async (refreshToken) => {
  if (!refreshToken) throw makeError('Không có refresh token', 401)

  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw makeError('Refresh token không hợp lệ hoặc đã hết hạn', 401)
  }

  const record = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!record || record.expiresAt < new Date()) {
    throw makeError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401)
  }

  const newAccessToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
    plan: payload.plan,
  })

  return { accessToken: newAccessToken }
}

/**
 * Đăng xuất — xóa refresh token
 */
export const logout = async (refreshToken) => {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }
}

/**
 * Lấy thông tin user hiện tại
 */
export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      plan: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  })
  if (!user) throw makeError('Người dùng không tồn tại', 404)
  return user
}

/**
 * Gửi email quên mật khẩu
 * - Luôn trả 200 để tránh email enumeration
 */
export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  if (!user) return true // Không tiết lộ email có tồn tại không

  // Xóa tất cả token cũ của user này
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } })

  const token = generateSecureToken()
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 giờ
    },
  })

  try {
    await sendPasswordResetEmail(user.email, user.username, token)
  } catch (err) {
    console.warn('[Auth] Failed to send password reset email:', err.message)
  }

  return true
}

/**
 * Đặt lại mật khẩu bằng token
 */
export const resetPassword = async (token, newPassword) => {
  const record = await prisma.passwordReset.findUnique({ where: { token } })

  if (!record || record.used) throw makeError('Token không hợp lệ hoặc đã được sử dụng', 400)
  if (record.expiresAt < new Date()) throw makeError('Token đã hết hạn. Vui lòng yêu cầu lại.', 410)

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction([
    // Cập nhật mật khẩu mới
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    // Đánh dấu token đã dùng
    prisma.passwordReset.update({
      where: { id: record.id },
      data: { used: true },
    }),
    // Thu hồi tất cả refresh tokens để buộc đăng nhập lại
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ])

  return true
}
