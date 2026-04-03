import slugify from 'slugify'
import { nanoid } from 'nanoid'

/**
 * Tạo unique slug từ tên project
 * @param {string} name
 * @returns {string} slug
 */
export const createSlug = (name) => {
  const base = slugify(name, { lower: true, strict: true, trim: true })
  const unique = nanoid(6)
  return `${base}-${unique}`
}
