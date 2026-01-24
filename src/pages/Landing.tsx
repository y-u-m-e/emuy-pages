/**
 * Landing Page - Dark Minimal Theme
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Gamepad2, 
  Code, 
  ArrowRight,
  Zap,
  Shield,
  Users,
  TrendingUp
} from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: 'Attendance Tracking',
    description: 'Track clan event attendance with the Cruddy Panel. View leaderboards, manage records, and monitor participation.',
    badge: 'Core',
    link: '/cruddy-panel'
  },
  {
    icon: Gamepad2,
    title: 'Tile Events',
    description: 'Participate in tile-based progression events. Complete challenges, upload screenshots, and track your progress.',
    badge: 'Events',
    href: 'https://ironforged.gg'
  },
  {
    icon: Code,
    title: 'API Access',
    description: 'Integrate with our unified API for OSRS data, attendance records, and event management.',
    badge: 'Developer',
    href: 'https://docs.emuy.gg'
  },
];

const stats = [
  { label: 'Active Members', value: '150+', icon: Users },
  { label: 'Events Tracked', value: '500+', icon: TrendingUp },
  { label: 'Uptime', value: '99.9%', icon: Zap },
  { label: 'Secure', value: 'RBAC', icon: Shield },
];

export default function Landing() {
  const { user, login } = useAuth();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          All systems operational
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="text-foreground">Emuy</span>
          <span className="text-gradient"> Tools</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          The complete management dashboard for OSRS clans. Track attendance, manage events, 
          and keep your community organized.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {user ? (
            <>
              <Button asChild size="lg" className="gap-2">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="https://docs.emuy.gg" target="_blank" rel="noopener noreferrer">
                  Read the Docs
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button onClick={login} size="lg" className="gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Sign in with Discord
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="https://docs.emuy.gg" target="_blank" rel="noopener noreferrer">
                  Learn More
                </a>
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card/50 border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Features Grid */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Everything you need</h2>
          <p className="text-muted-foreground mt-2">
            Tools built specifically for OSRS clan management
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isExternal = 'href' in feature;
            
            const cardContent = (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 w-fit">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {isExternal ? 'Visit' : 'Open'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </CardContent>
              </>
            );
            
            if (isExternal) {
              return (
                <Card 
                  key={feature.title} 
                  className="group hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <a 
                    href={feature.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {cardContent}
                  </a>
                </Card>
              );
            }
            
            return (
              <Card 
                key={feature.title} 
                className="group hover:border-primary/50 transition-colors cursor-pointer"
              >
                <Link to={feature.link!} className="block">
                  {cardContent}
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="text-center p-8 rounded-2xl border border-border bg-gradient-to-b from-card to-background">
          <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Sign in with your Discord account to access all features
          </p>
          <Button onClick={login} size="lg" className="gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Get Started
          </Button>
        </section>
      )}
    </div>
  );
}
