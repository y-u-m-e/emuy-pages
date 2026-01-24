/**
 * Dashboard - Main user dashboard with dark minimal theme
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Gamepad2, 
  Grid3X3, 
  Shield, 
  Settings, 
  BookOpen,
  ExternalLink,
  ChevronRight,
  Activity
} from 'lucide-react';

const quickLinks = [
  {
    id: 'cruddy',
    title: 'Attendance',
    description: 'Track and manage event attendance',
    icon: ClipboardList,
    to: '/cruddy-panel',
    permission: 'view_cruddy',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  {
    id: 'tile-events',
    title: 'Tile Events',
    description: 'Participate in Ironforged Events',
    icon: Gamepad2,
    href: 'https://ironforged.gg',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    id: 'bingo',
    title: 'Bingo',
    description: 'Join bingo competitions',
    icon: Grid3X3,
    href: 'https://bingo.emuy.gg',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  {
    id: 'docs',
    title: 'Documentation',
    description: 'API docs and guides',
    icon: BookOpen,
    href: 'https://docs.emuy.gg',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
];

const adminLinks = [
  {
    id: 'admin',
    title: 'Admin Panel',
    description: 'Manage users and permissions',
    icon: Shield,
    to: '/admin',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
  },
  {
    id: 'devops',
    title: 'DevOps',
    description: 'System status and deployments',
    icon: Settings,
    to: '/devops',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
  },
];

export default function Dashboard() {
  const { user, roles, isAdmin, hasPermission, login } = useAuth();

  const getAvatarUrl = (user: { id: string; avatar: string | null }) => {
    if (!user.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>
        <Button onClick={login} size="lg">
          Sign in with Discord
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to Emuy Tools</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/profile">
            <Activity className="w-4 h-4" />
            View Profile
          </Link>
        </Button>
      </div>

      {/* User Card */}
      <Card className="bg-gradient-to-r from-card to-secondary/30">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="w-16 h-16 border-2 border-border">
            <AvatarImage src={getAvatarUrl(user) || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {(user.global_name || user.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user.global_name || user.username}</h2>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map(role => (
                  <Badge
                    key={role.id}
                    variant="secondary"
                    style={{ 
                      backgroundColor: role.color + '20', 
                      color: role.color,
                      borderColor: role.color + '40'
                    }}
                    className="border"
                  >
                    {role.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {isAdmin && (
            <Badge variant="outline" className="border-red-500/50 text-red-400">
              Admin
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Admin Section */}
      {isAdmin && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Administration
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.id} to={link.to}>
                  <Card className={`group hover:border-primary/50 transition-all cursor-pointer border ${link.borderColor}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${link.bgColor} w-fit`}>
                          <Icon className={`w-5 h-5 ${link.color}`} />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <CardTitle className={`mt-2 ${link.color}`}>{link.title}</CardTitle>
                      <CardDescription>{link.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Quick Access
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            // Check permission for cruddy
            if (link.permission && !hasPermission(link.permission) && !isAdmin) {
              return null;
            }

            const Icon = link.icon;
            const isExternal = 'href' in link;

            if (isExternal) {
              return (
                <a 
                  key={link.id} 
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Card className="group hover:border-primary/50 transition-all cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${link.bgColor} w-fit`}>
                          <Icon className={`w-5 h-5 ${link.color}`} />
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors">
                        {link.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {link.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </a>
              );
            }

            return (
              <Link key={link.id} to={link.to!}>
                <Card className="group hover:border-primary/50 transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${link.bgColor} w-fit`}>
                        <Icon className={`w-5 h-5 ${link.color}`} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors">
                      {link.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {link.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
