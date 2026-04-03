import { Router } from 'express'
import authRoutes from './auth.routes.js'
import projectRoutes from './project.routes.js'
import diagramRoutes from './diagram.routes.js'
import parserRoutes from './parser.routes.js'
import exportRoutes from './export.routes.js'
import versionRoutes from './version.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/projects', projectRoutes)
router.use('/diagrams', diagramRoutes)
router.use('/parser', parserRoutes)
router.use('/export', exportRoutes)
router.use('/versions', versionRoutes)

export default router
