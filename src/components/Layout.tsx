/**
 * Layout Component - shadcn/ui Dashboard Style with Sidebar
 */

import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Shield, 
  Settings, 
  LogOut,
  User,
  Menu,
  Gamepad2,
  BookOpen,
  Grid3X3,
  Home,
  Search,
  Bell
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const toolsNavItems: NavItem[] = [
  { path: '/cruddy-panel', label: 'Attendance', icon: ClipboardList, badge: 'Tool' },
];

const externalNavItems: NavItem[] = [
  { path: 'https://ironforged.gg', label: 'Tile Events', icon: Gamepad2, external: true },
  { path: 'https://bingo.emuy.gg', label: 'Bingo', icon: Grid3X3, external: true },
  { path: 'https://docs.emuy.gg', label: 'Documentation', icon: BookOpen, external: true },
];

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Admin Panel', icon: Shield },
  { path: '/devops', label: 'DevOps', icon: Settings },
];

export default function Layout() {
  const { user, loading, login, logout, isAdmin, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const canViewCruddy = isAdmin || hasPermission('view_cruddy');

  const getAvatarUrl = (user: { id: string; avatar: string | null }) => {
    if (!user.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    if (item.external) {
      return (
        <a
          href={item.path}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {item.label}
          {item.badge && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {item.badge}
            </Badge>
          )}
        </a>
      );
    }
    
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
          active 
            ? "bg-accent text-foreground font-medium" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
        {item.badge && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col gap-2">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold" onClick={onNavigate}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">E</span>
          </div>
          <span className="text-lg">Emuy Tools</span>
        </Link>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {/* Main */}
          {mainNavItems.map((item) => (
            <NavLink key={item.path} item={item} onClick={onNavigate} />
          ))}
          
          {/* Tools (requires auth) */}
          {user && canViewCruddy && (
            <>
              <div className="my-2">
                <Separator />
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tools
                </p>
              </div>
              {toolsNavItems.map((item) => (
                <NavLink key={item.path} item={item} onClick={onNavigate} />
              ))}
            </>
          )}
          
          {/* External Apps */}
          <div className="my-2">
            <Separator />
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Apps
            </p>
          </div>
          {externalNavItems.map((item) => (
            <NavLink key={item.path} item={item} onClick={onNavigate} />
          ))}
          
          {/* Admin */}
          {user && isAdmin && (
            <>
              <div className="my-2">
                <Separator />
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {adminNavItems.map((item) => (
                <NavLink key={item.path} item={item} onClick={onNavigate} />
              ))}
            </>
          )}
        </nav>
      </div>
      
      {/* User section at bottom */}
      {user && (
        <div className="mt-auto border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={getAvatarUrl(user) || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(user.global_name || user.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.global_name || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar - Desktop */}
      <div className="hidden border-r bg-muted/40 md:block">
        <SidebarContent />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col">
        {/* Top header */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {/* Mobile menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          
          {/* Search placeholder */}
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3 h-9 rounded-md border border-input px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </form>
          </div>
          
          {/* Right side - notifications & user menu */}
          <div className="flex items-center gap-2">
            {user && (
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
              </Button>
            )}
            
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getAvatarUrl(user) || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(user.global_name || user.username).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.global_name || user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={login} size="sm" className="gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Sign in
              </Button>
            )}
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
