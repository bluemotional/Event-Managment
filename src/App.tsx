import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGate } from '@/components/auth/AuthGate'

function App() {
  return (
    <AuthGate>
      <AppLayout />
    </AuthGate>
  )
}

export default App
