import * as exportService from '../services/export.service.js'
import { ok, created } from '../utils/response.js'

// POST /export/share
export const createShareLink = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const { projectId, permission, expiresInDays } = req.body

    const shareLink = await exportService.createShareLink(projectId, permission, expiresInDays, userId, guestToken)
    
    // Front-end expects to build the URL: `${CLIENT_URL}/share/${shareLink.token}`
    return created(res, shareLink, 'Tạo link chia sẻ thành công')
  } catch (err) {
    next(err)
  }
}

// GET /export/share/:token
export const getSharedData = async (req, res, next) => {
  try {
    const { token } = req.params
    const data = await exportService.getSharedData(token)
    return ok(res, data)
  } catch (err) {
    next(err)
  }
}
