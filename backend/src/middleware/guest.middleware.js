import { nanoid } from 'nanoid'

// Tự động tạo guest token cookie nếu chưa có
export const guestSession = (req, res, next) => {
  const cookieName = process.env.GUEST_COOKIE_NAME || 'diagramio_guest'
  if (!req.cookies[cookieName]) {
    const guestToken = nanoid(32)
    res.cookie(cookieName, guestToken, {
      httpOnly: true,
      maxAge: Number(process.env.GUEST_COOKIE_MAX_AGE) || 2592000000,
      sameSite: 'lax',
    })
    req.guestToken = guestToken
  } else {
    req.guestToken = req.cookies[cookieName]
  }
  next()
}
