import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const APP_NAME = 'DiagramIO'
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const FROM = process.env.SMTP_FROM || `"${APP_NAME}" <noreply@diagramio.app>`

// ─── Base email layout ───────────────────────────────────────────────────────
const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${APP_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background: #0f1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .card { background: #1e2130; border-radius: 16px; border: 1px solid #2a2d3e; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 32px; }
    .body p { color: #cbd5e1; line-height: 1.7; margin: 0 0 16px; font-size: 15px; }
    .body .greeting { color: #f1f5f9; font-size: 17px; font-weight: 600; margin-bottom: 20px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1, #a78bfa); color: #fff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: 0.2px; }
    .note { background: #12151f; border: 1px solid #2a2d3e; border-radius: 10px; padding: 16px 20px; margin: 24px 0 0; }
    .note p { color: #64748b; font-size: 13px; margin: 0; }
    .note a { color: #6366f1; word-break: break-all; }
    .warning { background: #1a1208; border: 1px solid #f59e0b44; border-radius: 10px; padding: 14px 18px; margin: 20px 0 0; }
    .warning p { color: #fbbf24; font-size: 13px; margin: 0; }
    .footer { border-top: 1px solid #2a2d3e; padding: 20px 32px; text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
    .footer a { color: #6366f1; }
    .expire-badge { display: inline-block; background: #1a1208; border: 1px solid #f59e0b55; color: #f59e0b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      ${content}
    </div>
    <div style="text-align:center; margin-top:24px;">
      <p style="color:#334155; font-size:12px; margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`

// ─── Template: Email Verification ───────────────────────────────────────────
const verificationTemplate = (username, url) => baseLayout(`
  <div class="header">
    <h1>🔐 ${APP_NAME}</h1>
    <p>SQL to ERD Diagram Editor</p>
  </div>
  <div class="body">
    <p class="greeting">Chào ${username}! 👋</p>
    <p>Cảm ơn bạn đã đăng ký <strong style="color:#a78bfa">${APP_NAME}</strong>. Để kích hoạt tài khoản, vui lòng xác nhận địa chỉ email của bạn.</p>
    <span class="expire-badge">⏱ Hết hạn sau 24 giờ</span>
    <div class="btn-wrap">
      <a href="${url}" class="btn">✅ Xác nhận Email</a>
    </div>
    <div class="note">
      <p>Nếu nút không hoạt động, copy đường link sau vào trình duyệt:</p>
      <p style="margin-top:8px;"><a href="${url}">${url}</a></p>
    </div>
    <div class="warning">
      <p>⚠️ Nếu bạn không tạo tài khoản này, hãy bỏ qua email này. Link sẽ tự hết hạn.</p>
    </div>
  </div>
  <div class="footer">
    <p>Email này được gửi từ <a href="${APP_URL}">${APP_URL}</a></p>
  </div>
`)

// ─── Template: Password Reset ────────────────────────────────────────────────
const passwordResetTemplate = (username, url) => baseLayout(`
  <div class="header">
    <h1>🔑 Đặt lại mật khẩu</h1>
    <p>${APP_NAME}</p>
  </div>
  <div class="body">
    <p class="greeting">Chào ${username}!</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong style="color:#a78bfa">${APP_NAME}</strong> của bạn.</p>
    <span class="expire-badge">⏱ Hết hạn sau 1 giờ</span>
    <div class="btn-wrap">
      <a href="${url}" class="btn">🔐 Đặt lại mật khẩu</a>
    </div>
    <div class="note">
      <p>Nếu nút không hoạt động, copy đường link sau vào trình duyệt:</p>
      <p style="margin-top:8px;"><a href="${url}">${url}</a></p>
    </div>
    <div class="warning">
      <p>⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này và đảm bảo tài khoản của bạn vẫn an toàn.</p>
    </div>
  </div>
  <div class="footer">
    <p>Email này được gửi từ <a href="${APP_URL}">${APP_URL}</a></p>
  </div>
`)

// ─── Email senders ───────────────────────────────────────────────────────────
export const sendVerificationEmail = async (email, username, token) => {
  const url = `${APP_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `[${APP_NAME}] Xác nhận địa chỉ email của bạn`,
    html: verificationTemplate(username, url),
  })
}

export const sendPasswordResetEmail = async (email, username, token) => {
  const url = `${APP_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `[${APP_NAME}] Yêu cầu đặt lại mật khẩu`,
    html: passwordResetTemplate(username, url),
  })
}

// Verify transporter connection (gọi khi server start)
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify()
    console.log('✅ Email SMTP connection verified')
  } catch (err) {
    console.warn('⚠️  Email SMTP not configured:', err.message)
  }
}
