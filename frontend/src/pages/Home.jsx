export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DiagramIO</h1>
      <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>SQL → ERD Diagram Editor</p>
      <a href="/editor" style={{ padding: '0.75rem 2rem', background: '#6366f1', color: '#fff', borderRadius: '8px', fontWeight: 600, marginTop: '1rem' }}>
        Bắt đầu ngay →
      </a>
    </div>
  )
}
