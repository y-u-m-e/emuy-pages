/**
 * =============================================================================
 * STAGING GATE - Authorization for Preview/Staging Environments
 * =============================================================================
 * 
 * Wraps the app to require developer access on staging/preview URLs.
 * Production URLs bypass this check.
 */

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, Loader2 } from 'lucide-react';

interface StagingGateProps {
  children: ReactNode;
}

// Check if current URL is a staging/preview environment
function isStaging(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.includes('.pages.dev') ||
    hostname.includes('staging.') ||
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1')
  );
}

export default function StagingGate({ children }: StagingGateProps) {
  const { user, loading, isAdmin, hasPermission, login } = useAuth();
  
  // Production - no gate needed
  if (!isStaging()) {
    return <>{children}</>;
  }

  // Loading auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Staging Environment</h1>
          <p className="text-muted-foreground mb-6">
            This is a preview/staging deployment. Please sign in with developer access to continue.
          </p>
          <Button onClick={login} className="w-full">
            Sign in with Discord
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Only users with DevOps access can view staging environments.
          </p>
        </div>
      </div>
    );
  }

  // Check for developer permission
  const canAccessStaging = isAdmin || hasPermission('view_devops');

  if (!canAccessStaging) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the staging environment.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Signed in as: <span className="font-medium text-foreground">{user.global_name || user.username}</span>
          </p>
          <Button variant="outline" asChild>
            <a href="https://emuy.gg">Go to Production Site</a>
          </Button>
        </div>
      </div>
    );
  }

  // Authorized - show staging banner and content
  return (
    <>
      {/* Staging Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black text-center py-1 text-xs font-medium">
        🚧 STAGING ENVIRONMENT - Changes here won't affect production
      </div>
      <div className="pt-6">
        {children}
      </div>
    </>
  );
}

