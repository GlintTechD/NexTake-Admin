import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { AuthProvider } from './lib/auth/AuthProvider'
import { WorkspaceProvider } from './lib/workspace/WorkspaceProvider'

/**
 * Provider order matters:
 *
 *   AuthProvider       – acting profile (restored session, or the local admin)
 *   WorkspaceProvider  – content / intelligence stores, attributed to the actor
 *
 * There is no sign-in page: the console renders immediately.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </AuthProvider>
  </StrictMode>,
)
