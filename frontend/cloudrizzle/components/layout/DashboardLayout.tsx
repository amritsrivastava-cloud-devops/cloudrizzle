import Sidebar from './Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#07090e' }}>
      <Sidebar />
      <main className="flex-1 ml-56 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
