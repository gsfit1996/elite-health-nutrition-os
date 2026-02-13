import { z } from "zod"

export const checkInDatePattern = /^\d{4}-\d{2}-\d{2}$/

export const progressCheckInSchema = z.object({
  checkInDate: z
    .string()
    .regex(checkInDatePattern, "checkInDate must be in YYYY-MM-DD format"),
  timezone: z.string().min(1).max(100),
  weightKg: z
    .number()
    .min(35, "Weight must be at least 35kg")
    .max(300, "Weight must be at most 300kg")
    .optional(),
  adherencePercent: z
    .number()
    .int()
    .min(0, "adherencePercent must be at least 0")
    .max(100, "adherencePercent must be at most 100"),
  notes: z.string().max(2000).optional(),
})

export const progressRangeQuerySchema = z.object({
  from: z.string().regex(checkInDatePattern),
  to: z.string().regex(checkInDatePattern),
})

export type ProgressCheckInInput = z.infer<typeof progressCheckInSchema>

