import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { AuthProvider } from './lib/auth/AuthProvider'
import { WorkspaceProvider } from './lib/workspace/WorkspaceProvider'
import AdminGate from './components/auth/AdminGate'

/**
 * Provider order matters:
 *
 *   AuthProvider       – session + role, restored from the auth backend
 *   WorkspaceProvider  – content / intelligence stores, attributed to the actor
 *   AdminGate          – protected routes; renders sign-in until authenticated
 *
 * Nothing here hard-codes a credential: a signed-in profile always comes from
 * Supabase Auth (or the clearly-labelled local demo backend when no project is
 * configured).
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <WorkspaceProvider>
        <AdminGate>
          <App />
        </AdminGate>
      </WorkspaceProvider>
    </AuthProvider>
  </StrictMode>,
)
