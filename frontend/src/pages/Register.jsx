import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { UserPlus, Mail, Lock, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { registerAPI, checkEmailAPI } from '../api/auth.api'
import { useDebounce } from '../hooks/useDebounce'

export default function Register() {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  
  // Custom validation for email domain
  const [emailStatus, setEmailStatus] = useState('idle') // idle, loading, valid, invalid
  const [emailMessage, setEmailMessage] = useState('')
  const debouncedEmail = useDebounce(formData.email, 500)

  // Frontend domain check (to give instant feedback before submitting)
  useEffect(() => {
    if (!debouncedEmail || !debouncedEmail.includes('@')) {
      setEmailStatus('idle')
      return
    }

    const verifyEmailDomain = async () => {
      setEmailStatus('loading')
      try {
        const res = await checkEmailAPI(debouncedEmail)
        if (res.data.allowed) {
          setEmailStatus('valid')
          setEmailMessage('Email hợp lệ')
        } else {
          setEmailStatus('invalid')
          setEmailMessage(res.message)
        }
      } catch (err) {
        setEmailStatus('idle')
      }
    }
    verifyEmailDomain()
  }, [debouncedEmail])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (emailStatus === 'invalid') {
      toast.error('Loại Email không được hỗ trợ!')
      return
    }

    setLoading(true)
    try {
      const res = await registerAPI(formData.username, formData.email, formData.password)
      if (res.success) {
        toast.success(res.message || 'Đăng ký thành công! Vui lòng kiểm tra email.')
        navigate('/login')
      }
    } catch (error) {
      toast.error(error.message || 'Đăng ký thất bại')
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-textMain">Tên hiển thị</label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-textMuted" />
            </div>
            <input
              type="text"
              required
              minLength={3}
              pattern="^[a-zA-Z0-9_-]+$"
              title="Chỉ chứa chữ, số, gạch ngang và gạch dưới"
              className="block w-full pl-10 pr-3 py-2 border border-glass rounded-lg bg-surface text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="diagram_master"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMain">Địa chỉ Email (chỉ hỗ trợ Gmail, Outlook, Edu...)</label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-textMuted" />
            </div>
            <input
              type="email"
              required
              className={`block w-full pl-10 pr-10 py-2 border rounded-lg bg-surface text-textMain placeholder-textMuted focus:outline-none focus:ring-2 transition-all ${
                emailStatus === 'invalid' ? 'border-red-500/50 focus:ring-red-500' : 
                emailStatus === 'valid' ? 'border-green-500/50 focus:ring-green-500' : 'border-glass focus:ring-primary-500'
              }`}
              placeholder="you@hcmus.edu.vn"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {emailStatus === 'loading' && <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />}
              {emailStatus === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {emailStatus === 'invalid' && <AlertCircle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          {emailStatus === 'invalid' && (
            <p className="mt-1 text-xs text-red-500">{emailMessage}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-textMain">Mật khẩu</label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-textMuted" />
            </div>
            <input
              type="password"
              required
              minLength={8}
              className="block w-full pl-10 pr-3 py-2 border border-glass rounded-lg bg-surface text-textMain placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="Minimal 8 ký tự, 1 hoa, 1 số"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading || emailStatus === 'invalid'}
            className="w-full mt-2 flex justify-center py-2.5 flex-row items-center gap-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Đăng ký tài khoản
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-textMuted">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-primary-500 hover:text-primary-400">
          Đăng nhập ngay
        </Link>
      </div>
    </motion.div>
  )
}
