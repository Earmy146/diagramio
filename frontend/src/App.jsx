import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Database, Zap, GitBranch, Share2 } from 'lucide-react'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import EditorLayout from './layouts/EditorLayout'

// Pages - Auth Module
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'

// Pages - App Modules
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import ShareView from './pages/ShareView'

// Landing Home Page
const Home = () => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
    {/* Hero */}
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6 max-w-3xl"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 border border-glass bg-surface/60 backdrop-blur-xl rounded-full text-sm text-textMuted mb-4">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Hoàn toàn miễn phí &bull; Không cần thẻ tín dụng
      </div>

      <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 bg-[length:200%] animate-[shimmer_3s_infinite]">
        DiagramIO
      </h1>

      <p className="text-lg sm:text-xl text-textMuted max-w-2xl mx-auto leading-relaxed">
        Thiết kế <strong className="text-textMain">Entity-Relationship Diagram</strong> trực quan từ <strong className="text-textMain">SQL script</strong> của bạn — chỉ cần paste, nhấn nút, xong ngay.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/dashboard"
          className="px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl shadow-xl shadow-primary-500/25 transition-all hover:scale-105 active:scale-95"
        >
          Dùng thử ngay →
        </Link>
        <Link
          to="/register"
          className="px-8 py-3 border border-glass bg-surface/60 backdrop-blur-sm hover:bg-white/5 text-textMain font-semibold rounded-xl transition-all"
        >
          Tạo tài khoản miễn phí
        </Link>
      </div>
    </motion.div>

    {/* Features */}
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 w-full max-w-4xl"
    >
      {[
        {
          icon: <Zap className="w-6 h-6 text-yellow-500" />,
          title: 'Import SQL Tức Thì',
          desc: 'Dán CREATE TABLE script vào, ERD tự động render đúng layout trong 0.5 giây.'
        },
        {
          icon: <GitBranch className="w-6 h-6 text-green-500" />,
          title: 'Lịch Sử Phiên Bản',
          desc: 'Lưu checkpoint, rollback bất cứ lúc nào không lo mất công đo vẽ tay.'
        },
        {
          icon: <Share2 className="w-6 h-6 text-blue-500" />,
          title: 'Chia Sẻ Public Link',
          desc: 'Tạo liên kết read-only gửi cho khách hàng, đồng nghiệp mà không cần đăng nhập.'
        },
      ].map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          className="glass-panel p-6 text-left space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-surface border border-glass flex items-center justify-center">
            {f.icon}
          </div>
          <h3 className="font-bold text-textMain">{f.title}</h3>
          <p className="text-sm text-textMuted leading-relaxed">{f.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </div>
)

export default function App() {
  // Áp dụng class .dark từ Theme Store ở lần load đầu tiên
  useEffect(() => {
    const themeStr = localStorage.getItem('diagramio-theme')
    if (themeStr && themeStr.includes('"theme":"light"')) {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <Router>
      <Routes>
        {/* Layout chính (có Navbar) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* ShareView — fullscreen không Navbar */}
        <Route path="/share/:token" element={<ShareView />} />

        {/* Canvas Fullscreen */}
        <Route element={<EditorLayout />}>
          <Route path="/editor/:projectId/:diagramId?" element={<Editor />} />
        </Route>

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
