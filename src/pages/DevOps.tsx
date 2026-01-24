/**
 * =============================================================================
 * DEVOPS CONTROL PANEL
 * =============================================================================
 * 
 * Centralized DevOps dashboard for monitoring and managing infrastructure.
 * Updated for the microservices architecture.
 * 
 * Features:
 * - Repository status (GitHub commits, workflows)
 * - Microservice health checks
 * - Sesh Calendar Worker sync
 * - Widget heartbeats
 * - Discord Bot status
 * - Error logs viewer
 * - Quick links
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { API_URLS } from '@/lib/api-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  GitBranch, 
  GitMerge,
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Server,
  Globe,
  Bot,
  Calendar,
  Heart,
  AlertTriangle,
  Link as LinkIcon,
  ChevronRight,
  Activity,
  Gamepad2,
  FileText,
  Rocket,
  Settings,
  Eye
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface RepoStatus {
  name: string;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  type: 'pages' | 'worker' | 'bot';
  url?: string;
  stagingUrl?: string;
  lastCommit?: {
    sha: string;
    message: string;
    date: string;
    author: string;
  };
  workflows?: WorkflowRun[];
  loading: boolean;
  error?: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

interface ServiceHealth {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
  lastChecked?: string;
}

interface SeshWorkerStatus {
  worker: string;
  status: string;
  endpoints?: Record<string, string>;
  timestamp: string;
}

interface SeshWorkerConfig {
  guildId?: string;
  spreadsheetId?: string;
  sheetName?: string;
  serviceAccountConfigured?: boolean;
  privateKeyConfigured?: boolean;
}

interface SeshSyncResult {
  success: boolean;
  eventsCount?: number;
  authorCount?: number;
  duration?: number;
  timestamp?: string;
  error?: string;
}

interface DeployStatus {
  repo: string;
  status: 'idle' | 'checking' | 'merging' | 'success' | 'error';
  message?: string;
  devBranch?: {
    sha: string;
    message: string;
    date: string;
    author: string;
  };
  mainBranch?: {
    sha: string;
    message: string;
    date: string;
    author: string;
  };
  behindBy?: number;
  aheadBy?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GITHUB_ORG = 'y-u-m-e';

// GitHub repos that actually exist
// Note: API workers are deployed via Cloudflare but not on GitHub yet
const REPOS: Omit<RepoStatus, 'loading' | 'lastCommit' | 'workflows' | 'error'>[] = [
  // Frontend Pages (on GitHub)
  { 
    name: 'emuy-pages', 
    displayName: 'Emuy Pages',
    description: 'Main dashboard (emuy.gg)',
    icon: <Globe className="h-5 w-5" />,
    type: 'pages',
    url: 'https://emuy.gg'
  },
  { 
    name: 'ironforged-pages', 
    displayName: 'Ironforged Pages',
    description: 'Tile events (ironforged.gg)',
    icon: <Gamepad2 className="h-5 w-5" />,
    type: 'pages',
    url: 'https://ironforged.gg'
  },
  { 
    name: 'bingo-pages', 
    displayName: 'Bingo Pages',
    description: 'Bingo events (bingo.emuy.gg)',
    icon: <Activity className="h-5 w-5" />,
    type: 'pages',
    url: 'https://bingo.emuy.gg'
  },
  { 
    name: 'docs-pages', 
    displayName: 'Docs Pages',
    description: 'Documentation (docs.emuy.gg)',
    icon: <FileText className="h-5 w-5" />,
    type: 'pages',
    url: 'https://docs.emuy.gg',
    stagingUrl: 'https://dev.docs-pages-bj3.pages.dev'
  },
  // Bot (on GitHub)
  { 
    name: 'yume-bot', 
    displayName: 'Discord Bot',
    description: 'Bot on Railway',
    icon: <Bot className="h-5 w-5" />,
    type: 'bot'
  },
];

// Service health checks for all backend services
// API Workers are deployed on Cloudflare but not on GitHub yet
const SERVICES: Omit<ServiceHealth, 'status' | 'latency' | 'lastChecked'>[] = [
  { name: 'Auth API', url: API_URLS.AUTH },
  { name: 'Attendance API', url: API_URLS.ATTENDANCE },
  { name: 'Events API', url: API_URLS.EVENTS },
  { name: 'Bingo API', url: API_URLS.BINGO },
  { name: 'Sesh Worker', url: API_URLS.SESH },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function DevOps() {
  const { user, loading: authLoading, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const canViewDevOps = isAdmin || hasPermission('view_devops');

  // State
  const [repos, setRepos] = useState<RepoStatus[]>(
    REPOS.map(r => ({ ...r, loading: true }))
  );
  const [githubToken, setGithubToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [tokenSource, setTokenSource] = useState<'server' | 'local' | null>(null);
  const [loadingSecrets, setLoadingSecrets] = useState(true);
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
  
  // Service health
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>(
    SERVICES.map(s => ({ ...s, status: 'checking' as const }))
  );
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Sesh Calendar Worker state
  const [seshWorkerStatus, setSeshWorkerStatus] = useState<SeshWorkerStatus | null>(null);
  const [seshWorkerConfig, setSeshWorkerConfig] = useState<SeshWorkerConfig | null>(null);
  const [seshSyncing, setSeshSyncing] = useState(false);
  const [seshLastSync, setSeshLastSync] = useState<SeshSyncResult | null>(null);
  const [loadingSeshStatus, setLoadingSeshStatus] = useState(true);
  
  // Deployment state
  const [deployStatus, setDeployStatus] = useState<Record<string, DeployStatus>>({});

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Load GitHub token from localStorage only (server endpoint not available yet)
  useEffect(() => {
    const loadToken = () => {
      setLoadingSecrets(true);
      const saved = localStorage.getItem('github_pat');
      if (saved) {
        setGithubToken(saved);
        setTokenSaved(true);
        setTokenSource('local');
      }
      setLoadingSecrets(false);
    };
    
    if (user) loadToken();
    else setLoadingSecrets(false);
  }, [user]);

  // Fetch repo data when token available
  useEffect(() => {
    if (tokenSaved && githubToken) {
      fetchAllRepoData();
    }
  }, [tokenSaved, githubToken]);

  // Check service health and Sesh worker on mount
  useEffect(() => {
    checkAllServicesHealth();
    fetchSeshWorkerStatus();
    const interval = setInterval(() => {
      checkAllServicesHealth();
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && (!user || !canViewDevOps)) {
      navigate('/');
    }
  }, [user, authLoading, canViewDevOps, navigate]);

  const fetchAllRepoData = async () => {
    for (const repo of REPOS) {
      await fetchRepoData(repo.name);
    }
  };

  const fetchRepoData = async (repoName: string) => {
    setRepos(prev => prev.map(r => 
      r.name === repoName ? { ...r, loading: true, error: undefined } : r
    ));

    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits/main`,
        { headers: { Authorization: `Bearer ${githubToken}` } }
      );
      
      if (!commitRes.ok) throw new Error('Failed to fetch commits');
      const commitData = await commitRes.json();

      const workflowRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/actions/runs?per_page=5`,
        { headers: { Authorization: `Bearer ${githubToken}` } }
      );
      
      let workflowRuns: WorkflowRun[] = [];
      if (workflowRes.ok) {
        const workflowData = await workflowRes.json();
        workflowRuns = workflowData.workflow_runs || [];
      }

      setRepos(prev => prev.map(r => 
        r.name === repoName ? {
          ...r,
          loading: false,
          lastCommit: {
            sha: commitData.sha.substring(0, 7),
            message: commitData.commit.message.split('\n')[0],
            date: new Date(commitData.commit.author.date).toLocaleString(),
            author: commitData.commit.author.name,
          },
          workflows: workflowRuns,
        } : r
      ));
    } catch {
      setRepos(prev => prev.map(r => 
        r.name === repoName ? { ...r, loading: false, error: 'Failed to fetch' } : r
      ));
    }
  };

  const checkAllServicesHealth = useCallback(async () => {
    setCheckingHealth(true);
    const results = await Promise.all(
      SERVICES.map(async (service) => {
        const startTime = Date.now();
        try {
          const res = await fetch(`${service.url}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          const latency = Date.now() - startTime;
          return {
            ...service,
            status: res.ok ? 'online' : 'offline',
            latency,
            lastChecked: new Date().toISOString()
          } as ServiceHealth;
        } catch {
          return {
            ...service,
            status: 'offline',
            lastChecked: new Date().toISOString()
          } as ServiceHealth;
        }
      })
    );
    setServiceHealth(results);
    setCheckingHealth(false);
  }, []);

  // Fetch Sesh Calendar Worker status and config
  const fetchSeshWorkerStatus = async () => {
    setLoadingSeshStatus(true);
    try {
      const [statusRes, configRes] = await Promise.all([
        fetch(`${API_URLS.SESH}/status`),
        fetch(`${API_URLS.SESH}/config`)
      ]);
      
      if (statusRes.ok) {
        setSeshWorkerStatus(await statusRes.json());
      }
      if (configRes.ok) {
        setSeshWorkerConfig(await configRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch Sesh worker status:', err);
    } finally {
      setLoadingSeshStatus(false);
    }
  };

  // Trigger Sesh Calendar sync
  const triggerSeshSync = async () => {
    setSeshSyncing(true);
    setSeshLastSync(null);
    
    try {
      const res = await fetch(`${API_URLS.SESH}/sync`, {
        method: 'POST'
      });
      
      const data = await res.json();
      setSeshLastSync(data);
      
      // Refresh status after sync
      await fetchSeshWorkerStatus();
    } catch (err) {
      setSeshLastSync({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to trigger sync',
        timestamp: new Date().toISOString()
      });
    } finally {
      setSeshSyncing(false);
    }
  };

  // ==========================================================================
  // DEPLOYMENT FUNCTIONS
  // ==========================================================================

  // Check branch comparison for a repo
  const checkBranchComparison = async (repoName: string) => {
    const token = localStorage.getItem('github_pat');
    if (!token) {
      setDeployStatus(prev => ({
        ...prev,
        [repoName]: {
          repo: repoName,
          status: 'error',
          message: 'GitHub token not configured'
        }
      }));
      return;
    }

    setDeployStatus(prev => ({
      ...prev,
      [repoName]: {
        repo: repoName,
        status: 'checking'
      }
    }));

    try {
      const headers = { Authorization: `token ${token}` };
      
      // Fetch both branches
      const [devRes, mainRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits/dev`, { headers }),
        fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits/main`, { headers })
      ]);

      if (!devRes.ok || !mainRes.ok) {
        throw new Error('Failed to fetch branch info');
      }

      const [devData, mainData] = await Promise.all([devRes.json(), mainRes.json()]);

      // Compare branches
      const compareRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/compare/main...dev`,
        { headers }
      );
      
      let aheadBy = 0;
      let behindBy = 0;
      
      if (compareRes.ok) {
        const compareData = await compareRes.json();
        aheadBy = compareData.ahead_by || 0;
        behindBy = compareData.behind_by || 0;
      }

      setDeployStatus(prev => ({
        ...prev,
        [repoName]: {
          repo: repoName,
          status: 'idle',
          devBranch: {
            sha: devData.sha?.slice(0, 7),
            message: devData.commit?.message?.split('\n')[0] || 'No message',
            date: devData.commit?.committer?.date || '',
            author: devData.commit?.author?.name || 'Unknown'
          },
          mainBranch: {
            sha: mainData.sha?.slice(0, 7),
            message: mainData.commit?.message?.split('\n')[0] || 'No message',
            date: mainData.commit?.committer?.date || '',
            author: mainData.commit?.author?.name || 'Unknown'
          },
          aheadBy,
          behindBy
        }
      }));
    } catch (err) {
      setDeployStatus(prev => ({
        ...prev,
        [repoName]: {
          repo: repoName,
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to check branches'
        }
      }));
    }
  };

  // Merge dev into main
  const mergeBranches = async (repoName: string) => {
    const token = localStorage.getItem('github_pat');
    if (!token) {
      alert('GitHub token not configured');
      return;
    }

    if (!confirm(`Are you sure you want to merge dev → main for ${repoName}?\n\nThis will deploy to production.`)) {
      return;
    }

    setDeployStatus(prev => ({
      ...prev,
      [repoName]: {
        ...prev[repoName],
        status: 'merging'
      }
    }));

    try {
      const headers = {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/merges`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            base: 'main',
            head: 'dev',
            commit_message: `Merge dev into main - Deploy to production`
          })
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Merge failed');
      }

      setDeployStatus(prev => ({
        ...prev,
        [repoName]: {
          ...prev[repoName],
          status: 'success',
          message: 'Successfully merged! Deployment in progress...'
        }
      }));

      // Refresh after a short delay
      setTimeout(() => checkBranchComparison(repoName), 3000);
    } catch (err) {
      setDeployStatus(prev => ({
        ...prev,
        [repoName]: {
          ...prev[repoName],
          status: 'error',
          message: err instanceof Error ? err.message : 'Merge failed'
        }
      }));
    }
  };

  // Check all repos on mount
  const checkAllDeployments = useCallback(() => {
    const pagesRepoNames = REPOS.filter(r => r.type === 'pages').map(r => r.name);
    pagesRepoNames.forEach(name => checkBranchComparison(name));
  }, []);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const saveToken = () => {
    localStorage.setItem('github_pat', githubToken);
    setTokenSaved(true);
    setTokenSource('local');
  };

  const clearToken = () => {
    localStorage.removeItem('github_pat');
    setGithubToken('');
    setTokenSaved(false);
    setTokenSource(null);
  };

  const toggleRepoExpanded = (repoName: string) => {
    setExpandedRepos(prev => {
      const next = new Set(prev);
      if (next.has(repoName)) next.delete(repoName);
      else next.add(repoName);
      return next;
    });
  };

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') return <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />;
    if (status === 'queued') return <Clock className="h-3 w-3 text-yellow-400" />;
    if (conclusion === 'success') return <CheckCircle2 className="h-3 w-3 text-green-400" />;
    if (conclusion === 'failure') return <XCircle className="h-3 w-3 text-red-400" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };


  // ==========================================================================
  // LOADING/AUTH STATES
  // ==========================================================================

  if (authLoading || !user || !canViewDevOps) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const pagesRepos = repos.filter(r => r.type === 'pages');
  const botRepos = repos.filter(r => r.type === 'bot');

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              DevOps Control Panel
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor and manage your infrastructure
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tokenSaved && (
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                GitHub Connected
                <span className="text-muted-foreground ml-1">({tokenSource})</span>
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { fetchAllRepoData(); checkAllServicesHealth(); }}
                  disabled={!tokenSaved}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh all data</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* GitHub Token Setup */}
        {loadingSecrets ? (
          <Card>
            <CardContent className="py-6 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading configuration...</span>
            </CardContent>
          </Card>
        ) : !tokenSaved ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-yellow-400" />
                GitHub Token Required
              </CardTitle>
              <CardDescription>
                Enter a GitHub PAT with <code className="text-primary">repo</code> and <code className="text-primary">workflow</code> scopes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="flex-1"
                />
                <Button onClick={saveToken} disabled={!githubToken}>
                  Save Token
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Service Health Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Service Health
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={checkAllServicesHealth}
                disabled={checkingHealth}
              >
                {checkingHealth ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {serviceHealth.map((service) => (
                <div 
                  key={service.name} 
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'online' ? 'bg-green-500 animate-pulse' :
                      service.status === 'offline' ? 'bg-red-500' :
                      'bg-yellow-500 animate-pulse'
                    }`} />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  {service.latency && (
                    <span className="text-xs text-muted-foreground">{service.latency}ms</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="repos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="repos" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Repositories
            </TabsTrigger>
            <TabsTrigger value="deploy" className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Deploy
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Errors
            </TabsTrigger>
          </TabsList>

          {/* Repositories Tab */}
          <TabsContent value="repos" className="space-y-6">
            {/* Pages */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Frontend Pages
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {pagesRepos.map((repo) => (
                  <RepoCard 
                    key={repo.name} 
                    repo={repo} 
                    expanded={expandedRepos.has(repo.name)}
                    onToggle={() => toggleRepoExpanded(repo.name)}
                    onRefresh={() => fetchRepoData(repo.name)}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </div>

            {/* Bot */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Discord Bot
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {botRepos.map((repo) => (
                  <RepoCard 
                    key={repo.name} 
                    repo={repo} 
                    expanded={expandedRepos.has(repo.name)}
                    onToggle={() => toggleRepoExpanded(repo.name)}
                    onRefresh={() => fetchRepoData(repo.name)}
                    getStatusIcon={getStatusIcon}
                    isBot
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Deploy Tab */}
          <TabsContent value="deploy" className="space-y-6">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="h-5 w-5 text-amber-400" />
                      Deployment Manager
                    </CardTitle>
                    <CardDescription>
                      Merge staging (dev) branches to production (main) for Cloudflare Pages deployments
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={checkAllDeployments}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info Banner */}
                <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <GitMerge className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">How it works:</p>
                      <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
                        <li>Make changes on the <code className="px-1 bg-secondary rounded">dev</code> branch</li>
                        <li>Test on staging URL (e.g., dev.emuy-pages.pages.dev)</li>
                        <li>Click "Merge to Production" to deploy to production</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Deployment Cards */}
                <div className="grid gap-4">
                  {REPOS.filter(r => r.type === 'pages').map((repo) => {
                    const status = deployStatus[repo.name];
                    const isChecking = status?.status === 'checking';
                    const isMerging = status?.status === 'merging';
                    const hasChanges = (status?.aheadBy || 0) > 0;
                    const isUpToDate = status?.devBranch?.sha === status?.mainBranch?.sha;

                    return (
                      <Card key={repo.name} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            {/* Repo Info */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                {repo.icon}
                              </div>
                              <div>
                                <h4 className="font-semibold">{repo.displayName}</h4>
                                <p className="text-sm text-muted-foreground">{repo.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                  <a 
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Globe className="h-3 w-3" />
                                    Production
                                  </a>
                                  <a 
                                    href={repo.stagingUrl || `https://dev.${repo.name}.pages.dev`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-amber-400 hover:underline"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Staging
                                  </a>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => checkBranchComparison(repo.name)}
                                    disabled={isChecking || isMerging}
                                  >
                                    {isChecking ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Check branch status</TooltipContent>
                              </Tooltip>

                              <Button
                                variant={hasChanges ? "default" : "outline"}
                                size="sm"
                                onClick={() => mergeBranches(repo.name)}
                                disabled={isChecking || isMerging || isUpToDate || !status}
                                className={hasChanges ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
                              >
                                {isMerging ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Merging...
                                  </>
                                ) : (
                                  <>
                                    <GitMerge className="h-4 w-4 mr-2" />
                                    {isUpToDate ? 'Up to date' : 'Deploy to Prod'}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Branch Comparison */}
                          {status && status.status !== 'checking' && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              {status.status === 'error' ? (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                  <XCircle className="h-4 w-4" />
                                  {status.message}
                                </div>
                              ) : status.status === 'success' ? (
                                <div className="flex items-center gap-2 text-sm text-green-500">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {status.message}
                                </div>
                              ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                  {/* Dev Branch */}
                                  <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                                        dev (staging)
                                      </Badge>
                                      {hasChanges && (
                                        <Badge className="bg-amber-500 text-black text-xs">
                                          +{status.aheadBy} ahead
                                        </Badge>
                                      )}
                                    </div>
                                    {status.devBranch && (
                                      <div className="text-xs space-y-1">
                                        <p className="font-mono text-primary">{status.devBranch.sha}</p>
                                        <p className="text-muted-foreground truncate" title={status.devBranch.message}>
                                          {status.devBranch.message}
                                        </p>
                                        <p className="text-muted-foreground/70">
                                          {status.devBranch.author} • {new Date(status.devBranch.date).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Main Branch */}
                                  <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-green-400 border-green-500/30">
                                        main (production)
                                      </Badge>
                                      {isUpToDate && (
                                        <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          synced
                                        </Badge>
                                      )}
                                    </div>
                                    {status.mainBranch && (
                                      <div className="text-xs space-y-1">
                                        <p className="font-mono text-primary">{status.mainBranch.sha}</p>
                                        <p className="text-muted-foreground truncate" title={status.mainBranch.message}>
                                          {status.mainBranch.message}
                                        </p>
                                        <p className="text-muted-foreground/70">
                                          {status.mainBranch.author} • {new Date(status.mainBranch.date).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Loading State */}
                          {(!status || status.status === 'checking') && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {status?.status === 'checking' ? 'Checking branches...' : 'Click refresh to check branch status'}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Sesh Calendar Worker */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-400" />
                      Sesh Calendar
                    </CardTitle>
                    {loadingSeshStatus ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading
                      </Badge>
                    ) : seshWorkerStatus?.status === 'online' ? (
                      <Badge variant="outline" className="text-green-400 border-green-400/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-400 border-red-400/30">
                        <XCircle className="h-3 w-3 mr-1" /> Offline
                      </Badge>
                    )}
                  </div>
                  <CardDescription>Auto-sync Discord events to Google Sheets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Config Status */}
                  {seshWorkerConfig && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-secondary/50 text-xs">
                        <span className="text-muted-foreground block">Guild ID</span>
                        <span className="font-mono text-xs">{seshWorkerConfig.guildId?.slice(0, 8)}...</span>
                      </div>
                      <div className="p-2 rounded bg-secondary/50 text-xs">
                        <span className="text-muted-foreground block">Sheet</span>
                        <span>{seshWorkerConfig.sheetName}</span>
                      </div>
                      <div className="p-2 rounded bg-secondary/50 text-xs">
                        <span className="text-muted-foreground block">Service Account</span>
                        <span className={seshWorkerConfig.serviceAccountConfigured ? 'text-green-400' : 'text-red-400'}>
                          {seshWorkerConfig.serviceAccountConfigured ? '✓ Set' : '✗ Missing'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-secondary/50 text-xs">
                        <span className="text-muted-foreground block">Private Key</span>
                        <span className={seshWorkerConfig.privateKeyConfigured ? 'text-green-400' : 'text-red-400'}>
                          {seshWorkerConfig.privateKeyConfigured ? '✓ Set' : '✗ Missing'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={triggerSeshSync}
                      disabled={seshSyncing}
                      className="flex-1"
                    >
                      {seshSyncing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
                      ) : (
                        <><RefreshCw className="h-4 w-4 mr-2" /> Sync Now</>
                      )}
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={fetchSeshWorkerStatus}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh status</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${seshWorkerConfig?.spreadsheetId || '1ME5MvznNQy_F9RYIl8tqFTzw-6dSDyv7EX-Ln_Sq7HI'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open Google Sheet</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Last Sync Result */}
                  {seshLastSync && (
                    <div className={`p-3 rounded text-sm ${seshLastSync.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      {seshLastSync.success ? (
                        <div className="text-green-400">
                          <CheckCircle2 className="h-4 w-4 inline mr-2" />
                          Synced {seshLastSync.eventsCount} events ({seshLastSync.duration}ms)
                        </div>
                      ) : (
                        <div className="text-red-400">
                          <XCircle className="h-4 w-4 inline mr-2" />
                          {seshLastSync.error}
                        </div>
                      )}
                      {seshLastSync.timestamp && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(seshLastSync.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cron Info */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Auto-syncs every 2 hours via cron trigger
                  </div>
                </CardContent>
              </Card>

              {/* Widget Heartbeats - Coming Soon */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-400" />
                      Widget Heartbeats
                    </CardTitle>
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                      Coming Soon
                    </Badge>
                  </div>
                  <CardDescription>Carrd widget status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Backend endpoints not yet migrated</p>
                    <p className="text-xs mt-1">Widgets: Mention Maker, Event Parser, Infographic</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { href: 'https://dash.cloudflare.com', icon: '☁️', label: 'Cloudflare' },
                      { href: 'https://railway.app/dashboard', icon: '🚂', label: 'Railway' },
                      { href: `https://github.com/${GITHUB_ORG}`, icon: '🐙', label: 'GitHub' },
                      { href: `${API_URLS.AUTH}/health`, icon: '💚', label: 'API Health' },
                      { href: 'https://yumes-tools.itai.gg', icon: '🎴', label: 'Carrd Site' },
                      { href: 'https://discord.com/developers/applications', icon: '🎮', label: 'Discord' },
                    ].map(link => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <span className="text-xl">{link.icon}</span>
                        <span className="text-xs text-muted-foreground">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Error Logs Tab */}
          <TabsContent value="errors" className="space-y-4">
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Error Logs
                  </CardTitle>
                  <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                    Coming Soon
                  </Badge>
                </div>
                <CardDescription>Centralized error logging and monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Error Logging Not Yet Migrated</h3>
                  <p className="text-sm max-w-md mx-auto">
                    The error logging endpoints need to be added to the auth-api microservice. 
                    In the meantime, check Cloudflare dashboard for worker logs.
                  </p>
                  <div className="flex justify-center gap-3 mt-6">
                    <Button variant="outline" asChild>
                      <a 
                        href="https://dash.cloudflare.com/?to=/:account/workers/overview" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Cloudflare Workers
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a 
                        href="https://railway.app/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Railway Logs
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Token Clear Button */}
        {tokenSaved && tokenSource === 'local' && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={clearToken} className="text-muted-foreground">
              Clear saved GitHub token
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// REPO CARD COMPONENT
// =============================================================================

interface RepoCardProps {
  repo: RepoStatus;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  getStatusIcon: (status: string, conclusion: string | null) => React.ReactNode;
  isBot?: boolean;
}

function RepoCard({ 
  repo, 
  expanded, 
  onToggle, 
  onRefresh, 
  getStatusIcon,
  isBot
}: RepoCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
              {repo.icon}
            </div>
            <div>
              <CardTitle className="text-base">{repo.displayName}</CardTitle>
              <CardDescription className="text-xs">{repo.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {repo.url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={repo.url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visit site</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`https://github.com/y-u-m-e/${repo.name}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View on GitHub</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {repo.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : repo.error ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-400">{repo.error}</span>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            {/* Latest Commit */}
            {repo.lastCommit && (
              <div className="p-2 rounded bg-secondary/50 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <code className="text-primary font-mono text-xs">{repo.lastCommit.sha}</code>
                  <span className="truncate flex-1 text-foreground">{repo.lastCommit.message}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {repo.lastCommit.author} • {repo.lastCommit.date}
                </p>
              </div>
            )}

            {/* Workflows */}
            {repo.workflows && repo.workflows.length > 0 && (
              <div>
                <button 
                  onClick={onToggle}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  Recent workflows ({repo.workflows.length})
                </button>
                {expanded && (
                  <div className="space-y-1">
                    {repo.workflows.slice(0, 3).map((run) => (
                      <a
                        key={run.id}
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded bg-secondary/30 hover:bg-secondary/50 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          {getStatusIcon(run.status, run.conclusion)}
                          <span>{run.name}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString()}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {/* Pages auto-deploy note */}
            {repo.type === 'pages' && (
              <p className="text-xs text-muted-foreground italic">
                Auto-deploys on push via Cloudflare Pages
              </p>
            )}

            {/* Bot specific */}
            {isBot && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">🚂</span>
                    <span className="text-sm">Railway</span>
                  </div>
                  <Badge variant="outline" className="text-purple-400 border-purple-400/30">
                    Auto-deploy
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['/ping', '/leaderboard', '/lookup', '/tileevent', '/record', '/help'].map(cmd => (
                    <Badge key={cmd} variant="secondary" className="font-mono text-xs">
                      {cmd}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

