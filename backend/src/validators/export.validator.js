import { z } from 'zod'

export const createShareLinkSchema = z.object({
  projectId: z.number({ required_error: 'Yêu cầu projectId' }),
  permission: z.enum(['VIEW', 'EDIT']).default('VIEW').optional(),
  expiresInDays: z.number().min(1).max(365).optional().nullable()
})
