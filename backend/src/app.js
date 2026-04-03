import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'

import routes from './routes/index.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}))

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }))

// API routes
app.use('/api', routes)

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }))

// Global error handler
app.use(errorHandler)

export default app
