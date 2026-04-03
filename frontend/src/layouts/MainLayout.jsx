import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Database, LogOut, LayoutDashboard, User, Sun, Moon } from 'lucide-react'
import useAuthStore from '../stores/useAuthStore'
import useThemeStore from '../stores/useThemeStore'
import { Toaster } from 'react-hot-toast'

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
      {/* Navbar Mỏng mang phong cách Glassmorphism */}
      <header className="sticky top-0 z-50 w-full border-b border-glass bg-surface/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center p-2 shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-textMain">DiagramIO</span>
              </Link>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg text-textMuted hover:text-textMain hover:bg-white/5 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <Link to="/dashboard" className="text-sm font-medium text-textMuted hover:text-textMain transition-colors flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <div className="h-4 w-px bg-glass mx-1"></div>
                  <div className="flex items-center gap-2 text-sm text-textMain px-3 py-1.5 rounded-full border border-glass bg-white/5">
                    <User className="w-4 h-4 text-primary-500" />
                    <span>{user.username}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-sm font-medium text-textMuted hover:text-textMain transition-colors">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20 transition-all">
                    Đăng ký miễn phí
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full h-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Toaster for notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text-main)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(12px)',
          }
        }}
      />
    </div>
  )
}
