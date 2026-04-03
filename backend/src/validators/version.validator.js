import { z } from 'zod'

export const createVersionSchema = z.object({
  snapshot: z.any({ required_error: 'Yêu cầu snapshot dữ liệu để lưu version' }),
  message: z.string().max(500, 'Tóm tắt phiên bản không được quá 500 ký tự').optional(),
})
