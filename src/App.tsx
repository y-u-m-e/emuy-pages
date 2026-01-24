/**
 * =============================================================================
 * EMUY PAGES - Main Tools Dashboard
 * =============================================================================
 * 
 * Main application for the emuy.gg tools dashboard.
 * Provides access to Cruddy Panel, admin features, and system status.
 * 
 * @author Yume Tools Team
 */

import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import StagingGate from '@/components/StagingGate'

// Pages
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import CruddyPanel from '@/pages/CruddyPanel'
import Admin from '@/pages/Admin'
import DevOps from '@/pages/DevOps'
import Profile from '@/pages/Profile'

function App() {
  return (
    <AuthProvider>
      <StagingGate>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="cruddy-panel" element={<CruddyPanel />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<Admin />} />
            <Route path="devops" element={<DevOps />} />
          </Route>
        </Routes>
      </StagingGate>
    </AuthProvider>
  )
}

export default App

