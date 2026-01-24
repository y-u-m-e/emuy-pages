/**
 * =============================================================================
 * PROFILE PAGE - User Profile & Permissions
 * =============================================================================
 * 
 * Displays the logged-in user's Discord profile and application permissions.
 * Redesigned with shadcn/ui components and GitHub dark minimal theme.
 * 
 * Features:
 * - Discord profile display (avatar, username, display name)
 * - Account information (Discord ID, username, account type)
 * - Permission status grid showing access to each app feature
 * - Activity statistics (if user has cruddy access)
 * - Quick action links to accessible features
 * - Sign out functionality
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { API_URLS } from '@/lib/api-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  User, 
  Shield, 
  Key, 
  Activity,
  ExternalLink,
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
  ClipboardList,
  FileText,
  Settings,
  Rocket,
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface UserStats {
  attendanceRecords?: number;
  lastActive?: string;
}


// =============================================================================
// COMPONENT
// =============================================================================

export default function Profile() {
  const { user, loading, isAdmin, hasPermission, login, logout } = useAuth();
  
  // Derived access flags
  const canViewCruddy = isAdmin || hasPermission('view_cruddy');
  const canViewDocs = isAdmin || hasPermission('view_docs');
  const canViewDevOps = isAdmin || hasPermission('view_devops');
  
  // State
  const [stats, setStats] = useState<UserStats>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    if (user && canViewCruddy) {
      fetchUserStats();
    }
  }, [user, canViewCruddy]);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchUserStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_URLS.ATTENDANCE}/attendance/records`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          attendanceRecords: data.records?.length || 0,
          lastActive: new Date().toISOString()
        });
      }
    } catch {
      // Silently fail
    }
    setLoadingStats(false);
  };


  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const getAvatarUrl = (userId: string, avatarHash: string | null, size = 256) => {
    if (!avatarHash) {
      const defaultIndex = parseInt(userId) % 5;
      return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
  };

  const getBannerGradient = (userId: string) => {
    const gradients = [
      'from-purple-600 via-purple-500 to-blue-600',
      'from-emerald-600 via-emerald-500 to-teal-600',
      'from-orange-600 via-orange-500 to-red-600',
      'from-pink-600 via-pink-500 to-purple-600',
      'from-cyan-600 via-cyan-500 to-blue-600',
      'from-yellow-600 via-yellow-500 to-orange-600',
      'from-indigo-600 via-indigo-500 to-purple-600',
    ];
    return gradients[parseInt(userId) % gradients.length];
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ==========================================================================
  // UNAUTHENTICATED STATE
  // ==========================================================================

  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center">
          <CardContent className="py-12">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              Connect with Discord to view your profile
            </p>
            <Button onClick={login} size="lg" className="bg-[#5865F2] hover:bg-[#4752C4]">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Sign in with Discord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================================================
  // AUTHENTICATED VIEW
  // ==========================================================================

  const displayName = user.global_name || user.username;
  const fullUsername = `@${user.username}`;

  // Permission items for the grid
  const permissions = [
    { 
      name: 'Cruddy Panel', 
      desc: 'Attendance tracking', 
      icon: <ClipboardList className="h-5 w-5" />,
      granted: canViewCruddy,
      link: '/cruddy-panel'
    },
    { 
      name: 'Documentation', 
      desc: 'API guides & reference', 
      icon: <FileText className="h-5 w-5" />,
      granted: canViewDocs,
      link: '/docs'
    },
    { 
      name: 'Admin Panel', 
      desc: 'User management', 
      icon: <Settings className="h-5 w-5" />,
      granted: isAdmin,
      link: '/admin'
    },
    { 
      name: 'DevOps Panel', 
      desc: 'Deployment controls', 
      icon: <Rocket className="h-5 w-5" />,
      granted: canViewDevOps,
      link: '/devops'
    },
  ];


  return (
    <TooltipProvider delayDuration={200}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ========== PROFILE HEADER ========== */}
        <Card className="overflow-hidden">
          {/* Dynamic Banner */}
          <div className={`h-32 bg-gradient-to-r ${getBannerGradient(user.id)}`} />
          
          {/* Profile Info */}
          <CardContent className="relative pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Avatar */}
              <div className="-mt-16 relative">
                <Avatar className="w-32 h-32 border-4 border-background">
                  <AvatarImage src={getAvatarUrl(user.id, user.avatar)} alt={displayName} />
                  <AvatarFallback className="text-4xl">{displayName[0]}</AvatarFallback>
                </Avatar>
                {isAdmin && (
                  <Badge className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground">
                    <Shield className="h-3 w-3 mr-1" />
                    ADMIN
                  </Badge>
                )}
              </div>
              
              {/* Name & Username */}
              <div className="flex-1 pb-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <p className="text-muted-foreground">{fullUsername}</p>
              </div>

              {/* Sign Out Button */}
              <Button variant="destructive" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ========== INFO GRID ========== */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Discord ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{user.id}</code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(user.id)}
                      >
                        {copiedId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copiedId ? 'Copied!' : 'Copy ID'}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Username</span>
                <span>{fullUsername}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Display Name</span>
                <span>{displayName}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Account Type</span>
                <Badge variant={isAdmin ? 'default' : 'secondary'}>
                  {isAdmin ? 'Administrator' : 'Member'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5 text-primary" />
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {permissions.map((perm) => (
                <div 
                  key={perm.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{perm.icon}</div>
                    <div>
                      <div className="font-medium">{perm.name}</div>
                      <div className="text-xs text-muted-foreground">{perm.desc}</div>
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={perm.granted 
                      ? 'border-green-500/30 text-green-400 bg-green-500/10' 
                      : 'border-red-500/30 text-red-400 bg-red-500/10'
                    }
                  >
                    {perm.granted ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Granted</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Denied</>
                    )}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ========== ACTIVITY STATS ========== */}
        {canViewCruddy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">
                    {loadingStats ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    ) : (
                      stats.attendanceRecords ?? '-'
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Attendance Records</div>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    <CheckCircle2 className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Active Session</div>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold">
                    {permissions.filter(p => p.granted).length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Active Permissions</div>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">
                    {isAdmin ? <Shield className="h-8 w-8 mx-auto" /> : '○'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{isAdmin ? 'Admin' : 'Member'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== QUICK ACTIONS ========== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {permissions.filter(p => p.granted).map((perm) => (
                <Link
                  key={perm.name}
                  to={perm.link}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                >
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    {perm.icon}
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {perm.name}
                  </span>
                </Link>
              ))}
              <a
                href="https://discord.com/users/@me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <MessageSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  Discord Profile
                </span>
              </a>
            </div>
          </CardContent>
        </Card>

      </div>
    </TooltipProvider>
  );
}
