import 'dotenv/config'
import app from './app.js'
import { verifyEmailConnection } from './services/email.service.js'

const PORT = process.env.PORT || 4000

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
  // Kiểm tra kết nối SMTP
  await verifyEmailConnection()
})
