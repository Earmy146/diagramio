import { Outlet, Link } from 'react-router-dom'
import { Database, Home, ArrowLeft } from 'lucide-react'
import useThemeStore from '../stores/useThemeStore'
import { Toaster } from 'react-hot-toast'

export default function EditorLayout() {
  // Editor Layout chiếm toàn bộ màn hình, không padding, header đặc biệt
  const { theme } = useThemeStore()

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-background font-sans">
      
      {/* Editor Header (Toolbar) */}
      <header className="flex-shrink-0 h-14 border-b border-glass bg-surface flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-1.5 hover:bg-white/5 rounded-md text-textMuted hover:text-textMain transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-5 w-px bg-glass"></div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
              <Database className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-textMain text-sm">Editor</span>
          </div>
        </div>

        {/* Chừa chỗ (Portal) cho EditorTools (Save button, Export, Share...) được mount từ Editor component */}
        <div id="editor-toolbar-portal" className="flex items-center gap-2"></div>
      </header>

      {/* React Flow Container */}
      <main className="flex-1 w-full relative h-[calc(100vh-3.5rem)]">
        <Outlet />
      </main>

      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text-main)',
            border: '1px solid var(--glass-border)',
          }
        }}
      />
    </div>
  )
}
