import { z } from 'zod'

const EMAIL_REQUIRED = 'Email là bắt buộc'
const EMAIL_INVALID = 'Email không hợp lệ'
const PASSWORD_MIN = 'Mật khẩu phải có ít nhất 8 ký tự'
const PASSWORD_UPPERCASE = 'Mật khẩu phải có ít nhất 1 chữ hoa'
const PASSWORD_NUMBER = 'Mật khẩu phải có ít nhất 1 chữ số'

const passwordSchema = z
  .string({ required_error: 'Mật khẩu là bắt buộc' })
  .min(8, PASSWORD_MIN)
  .refine((v) => /[A-Z]/.test(v), PASSWORD_UPPERCASE)
  .refine((v) => /[0-9]/.test(v), PASSWORD_NUMBER)

export const registerSchema = z.object({
  email: z
    .string({ required_error: EMAIL_REQUIRED })
    .email(EMAIL_INVALID)
    .max(255, 'Email quá dài'),
  username: z
    .string({ required_error: 'Username là bắt buộc' })
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(50, 'Username tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username chỉ được chứa chữ cái, số, _ và -'),
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: z.string({ required_error: EMAIL_REQUIRED }).email(EMAIL_INVALID),
  password: z.string({ required_error: 'Mật khẩu là bắt buộc' }).min(1),
})

export const emailSchema = z.object({
  email: z.string({ required_error: EMAIL_REQUIRED }).email(EMAIL_INVALID),
})

export const verifyEmailSchema = z.object({
  token: z.string({ required_error: 'Token là bắt buộc' }).min(1),
})

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token là bắt buộc' }).min(1),
  newPassword: passwordSchema,
})
