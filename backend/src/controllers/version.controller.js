import * as versionService from '../services/version.service.js'
import { ok, created } from '../utils/response.js'

export const createVersion = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const { projectId } = req.params
    const { snapshot, message } = req.body

    const version = await versionService.createVersion(projectId, snapshot, message, userId, guestToken)
    return created(res, version, 'Lưu snapshot thành công')
  } catch (err) {
    next(err)
  }
}

export const listVersions = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const { projectId } = req.params

    const versions = await versionService.listVersions(projectId, userId, guestToken)
    return ok(res, versions)
  } catch (err) {
    next(err)
  }
}

export const getVersion = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const { versionId } = req.params

    const version = await versionService.getVersion(versionId, userId, guestToken)
    return ok(res, version)
  } catch (err) {
    next(err)
  }
}

export const getTemplates = async (req, res, next) => {
  try {
    const templates = versionService.getTemplates()
    return ok(res, templates)
  } catch (err) {
    next(err)
  }
}
