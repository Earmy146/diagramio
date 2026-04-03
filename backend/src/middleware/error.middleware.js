export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`)

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Duplicate entry', field: err.meta?.target })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' })
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  return res.status(statusCode).json({ success: false, message })
}
