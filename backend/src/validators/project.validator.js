import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z.string({ required_error: 'Tên dự án là bắt buộc' }).min(1, 'Tên dự án không được để trống').max(255, 'Tên dự án quá dài'),
  description: z.string().max(1000, 'Mô tả quá dài').optional(),
  defaultDialect: z.enum(['MYSQL', 'POSTGRESQL', 'SQLITE', 'NOSQL']).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Tên dự án không được để trống').max(255, 'Tên dự án quá dài').optional(),
  description: z.string().max(1000, 'Mô tả quá dài').optional().nullable(),
  isPublic: z.boolean().optional(),
  defaultDialect: z.enum(['MYSQL', 'POSTGRESQL', 'SQLITE', 'NOSQL']).optional(),
})
