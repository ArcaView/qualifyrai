import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { resetOnboardingTour, OnboardingTour } from "@/components/OnboardingTour";
import {
  LayoutDashboard,
  Code2,
  Settings,
  BarChart3,
  CreditCard,
  Briefcase,
  FileText,
  Upload,
  Users,
  Play,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Business metrics and insights",
  },
  {
    title: "Parse CV",
    href: "/dashboard/parse",
    icon: FileText,
    description: "Parse a single CV",
  },
  {
    title: "Bulk Parse",
    href: "/dashboard/bulk-parse",
    icon: Upload,
    description: "Parse multiple CVs",
  },
  {
    title: "Cover Letter Review",
    href: "/dashboard/cover-letter",
    icon: FileText,
    description: "Review and analyze cover letters",
    disabled: true,
    comingSoon: true,
  },
  {
    title: "Open Roles",
    href: "/dashboard/roles",
    icon: Briefcase,
    description: "Manage open positions",
  },
  {
    title: "Candidates",
    href: "/dashboard/candidates",
    icon: Users,
    description: "View all candidates",
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    description: "Recruitment and API analytics",
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    description: "Subscription and invoices",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Account preferences",
  },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [runTour, setRunTour] = useState(false);

  // Check if tour should auto-start from sidebar button click
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const shouldStartTour = localStorage.getItem("start_onboarding_tour");
      const tourActive = localStorage.getItem("onboarding_tour_active");

      // Don't start a new tour if one is already running
      if (tourActive === "true") {
        setRunTour(true);
        clearInterval(checkInterval);
        return;
      }

      if (shouldStartTour === "true") {
        localStorage.removeItem("start_onboarding_tour");

        // Navigate to main dashboard if not already there
        if (location.pathname !== "/dashboard") {
          navigate("/dashboard");

          // Wait for navigation then start tour
          setTimeout(() => {
            setRunTour(true);
          }, 500);
        } else {
          // Already on dashboard, start tour after short delay
          setTimeout(() => {
            setRunTour(true);
          }, 500);
        }

        clearInterval(checkInterval);
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
    };
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <OnboardingTour run={runTour} />
      <Navbar />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-muted/30 hidden md:block">
          <div className="sticky top-16 p-6 space-y-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-1">Dashboard</h2>
              <p className="text-sm text-muted-foreground">
                Manage your account
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mb-6 justify-start"
              onClick={() => {
                resetOnboardingTour();
                // Dispatch custom event to notify Dashboard
                window.dispatchEvent(new CustomEvent('startTour'));
              }}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Tour
            </Button>

            <nav className="space-y-1" data-tour="sidebar-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const isDisabled = (item as any).disabled;
                const isComingSoon = (item as any).comingSoon;

                // Add data-tour attributes to specific nav items
                const getTourAttr = () => {
                  if (item.href === "/dashboard/parse") return "nav-parse";
                  if (item.href === "/dashboard/roles") return "nav-roles";
                  if (item.href === "/dashboard/candidates") return "nav-candidates";
                  if (item.href === "/dashboard/developer") return "nav-developer";
                  return undefined;
                };

                // Render disabled items differently
                if (isDisabled) {
                  return (
                    <div
                      key={item.href}
                      data-tour={getTourAttr()}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        "text-muted-foreground cursor-not-allowed opacity-50",
                        "hover:opacity-70 hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 flex items-center justify-between">
                        <div>{item.title}</div>
                        {isComingSoon && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Soon
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    data-tour={getTourAttr()}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1">
                      <div>{item.title}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden w-full border-b border-border bg-background">
          <div className="overflow-x-auto">
            <div className="px-4 pt-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  resetOnboardingTour();
                  // Dispatch custom event to notify Dashboard
                  window.dispatchEvent(new CustomEvent('startTour'));
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Tour
              </Button>
            </div>
            <nav className="flex gap-1 p-4 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const isDisabled = (item as any).disabled;
                const isComingSoon = (item as any).comingSoon;

                // Render disabled items differently
                if (isDisabled) {
                  return (
                    <div
                      key={item.href}
                      className={cn(
                        "group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all duration-200",
                        "text-muted-foreground cursor-not-allowed opacity-50",
                        "hover:opacity-70 hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.title}
                      {isComingSoon && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1">
                          Soon
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
};
