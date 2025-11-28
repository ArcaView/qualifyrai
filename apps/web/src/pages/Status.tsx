import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Activity,
  Zap,
  Database,
  Cloud,
} from "lucide-react";
import { useState, useEffect } from "react";

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  description: string;
  icon: React.ReactNode;
  responseTime?: number;
  lastChecked?: Date;
}

const Status = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'ParseScore API',
      status: 'checking',
      description: 'CV parsing and scoring engine',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      name: 'AI Scoring (OpenAI)',
      status: 'checking',
      description: 'AI-powered candidate scoring',
      icon: <Zap className="w-5 h-5" />,
    },
    {
      name: 'Database',
      status: 'checking',
      description: 'Supabase database and authentication',
      icon: <Database className="w-5 h-5" />,
    },
    {
      name: 'File Storage',
      status: 'checking',
      description: 'CV file storage and retrieval',
      icon: <Cloud className="w-5 h-5" />,
    },
  ]);

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [checking, setChecking] = useState(false);

  const checkServices = async () => {
    setChecking(true);
    const updatedServices = [...services];

    // Check ParseScore API
    try {
      const parseScoreUrl = import.meta.env.VITE_PARSESCORE_API_URL;
      const start = Date.now();

      // Simple health check - just check if the URL is reachable
      const response = await fetch(`${parseScoreUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      const responseTime = Date.now() - start;

      updatedServices[0] = {
        ...updatedServices[0],
        status: response?.ok ? 'operational' : 'down',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      updatedServices[0] = {
        ...updatedServices[0],
        status: 'down',
        lastChecked: new Date(),
      };
    }

    // Check AI Scoring (OpenAI) - indirect check via ParseScore API
    try {
      const parseScoreUrl = import.meta.env.VITE_PARSESCORE_API_URL;
      const start = Date.now();

      // Check if the scoring endpoint is responsive
      const response = await fetch(`${parseScoreUrl}/ai/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      const responseTime = Date.now() - start;

      updatedServices[1] = {
        ...updatedServices[1],
        status: response?.ok ? 'operational' : 'degraded',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      // If we can't reach the AI health endpoint, mark as degraded (not down)
      // because basic scoring might still work
      updatedServices[1] = {
        ...updatedServices[1],
        status: 'degraded',
        lastChecked: new Date(),
      };
    }

    // Check Database (Supabase)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const start = Date.now();

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      const responseTime = Date.now() - start;

      updatedServices[2] = {
        ...updatedServices[2],
        status: response ? 'operational' : 'down',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      updatedServices[2] = {
        ...updatedServices[2],
        status: 'down',
        lastChecked: new Date(),
      };
    }

    // Check File Storage (Supabase Storage)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const start = Date.now();

      const response = await fetch(`${supabaseUrl}/storage/v1/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      const responseTime = Date.now() - start;

      updatedServices[3] = {
        ...updatedServices[3],
        status: response ? 'operational' : 'down',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      updatedServices[3] = {
        ...updatedServices[3],
        status: 'down',
        lastChecked: new Date(),
      };
    }

    setServices(updatedServices);
    setLastUpdate(new Date());
    setChecking(false);
  };

  useEffect(() => {
    checkServices();
    // Auto-refresh every 60 seconds
    const interval = setInterval(checkServices, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Operational
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Clock className="w-3 h-3 mr-1" />
            Degraded
          </Badge>
        );
      case 'down':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Down
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        );
    }
  };

  const overallStatus = services.every(s => s.status === 'operational')
    ? 'operational'
    : services.some(s => s.status === 'down')
    ? 'degraded'
    : 'degraded';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <section className="py-12 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">System Status</h1>
                <p className="text-muted-foreground">
                  Real-time status of QualifyRAI services
                </p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(overallStatus === 'operational' ? 'operational' : 'degraded')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkServices}
                  disabled={checking}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Services Status */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {services.map((service, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          p-2 rounded-lg
                          ${service.status === 'operational' ? 'bg-success/10 text-success' : ''}
                          ${service.status === 'degraded' ? 'bg-warning/10 text-warning' : ''}
                          ${service.status === 'down' ? 'bg-destructive/10 text-destructive' : ''}
                          ${service.status === 'checking' ? 'bg-muted' : ''}
                        `}>
                          {service.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {service.description}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div>
                        {service.responseTime && (
                          <span>Response time: {service.responseTime}ms</span>
                        )}
                      </div>
                      <div>
                        {service.lastChecked && (
                          <span>Last checked: {service.lastChecked.toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Status Information</CardTitle>
                <CardDescription>
                  Last updated: {lastUpdate.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">What do the statuses mean?</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                      <span><strong>Operational:</strong> All systems functioning normally</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-warning mt-0.5" />
                      <span><strong>Degraded:</strong> Service available but performance may be impacted</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <span><strong>Down:</strong> Service currently unavailable</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Impact on features:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>ParseScore API Down:</strong> CV parsing and scoring unavailable</li>
                    <li>• <strong>AI Scoring Degraded:</strong> Basic scoring available, AI features limited</li>
                    <li>• <strong>Database Down:</strong> Unable to save or retrieve data</li>
                    <li>• <strong>File Storage Down:</strong> Unable to upload or download CVs</li>
                  </ul>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs">
                    Status checks run automatically every 60 seconds. Click "Refresh" to check immediately.
                    If you're experiencing issues not reflected here, please contact support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Status;
