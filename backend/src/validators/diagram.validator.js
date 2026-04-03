import { z } from 'zod'

export const createDiagramSchema = z.object({
  name: z.string().min(1, 'Tên Diagram không được bỏ trống').max(255).optional(),
})

export const updateDiagramSchema = z.object({
  name: z.string().max(255).optional(),
  canvasState: z.any().optional(),   // JSON data chứa nodes và edges từ frontend
  zoomLevel: z.number().optional(),
  panX: z.number().optional(),
  panY: z.number().optional(),
})
