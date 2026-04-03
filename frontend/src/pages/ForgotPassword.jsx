import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import apiClient from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await apiClient.post('/auth/forgot-password', { email })
      if (res.success) {
        toast.success(res.message || 'Email khôi phục đã được gửi!')
        setSuccess(true)
      }
    } catch (error) {
      toast.error(error.message || 'Lỗi gửi yêu cầu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-textMain">Khôi phục mật khẩu</h2>
            <p className="text-sm text-textMuted mt-2">Nhập email của bạn để nhận liên kết đặt lại mật khẩu mới.</p>
          </div>

          <div>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-textMuted" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-2 border border-glass rounded-lg bg-surface text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 items-center gap-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gửi liên kết khôi phục'}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-textMain">Kiểm tra hộp thư đến</h2>
          <p className="text-sm text-textMuted">Chúng tôi đã gửi một link khôi phục bảo mật tới <b>{email}</b>. Hãy thay đổi mật khẩu thông qua đường link đó.</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-textMuted hover:text-textMain transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
        </Link>
      </div>
    </motion.div>
  )
}
