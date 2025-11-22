import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";

interface OnboardingTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export const OnboardingTour = ({ run = true, onComplete }: OnboardingTourProps) => {
  const navigate = useNavigate();
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Check if tour is already running (persisted in localStorage)
    const tourActive = localStorage.getItem("onboarding_tour_active");
    const savedStep = localStorage.getItem("onboarding_tour_step");

    if (tourActive === "true" && savedStep) {
      // Resume tour from saved step
      const step = parseInt(savedStep, 10);
      setStepIndex(step);
      setTimeout(() => {
        setRunTour(true);
      }, 800);
    } else if (run) {
      // Start new tour
      setStepIndex(0);
      localStorage.setItem("onboarding_tour_active", "true");
      localStorage.setItem("onboarding_tour_step", "0");
      setTimeout(() => {
        setRunTour(true);
      }, 800);
    } else {
      setRunTour(false);
    }
  }, [run]);

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Welcome to Qualifyr.AI! 🎉</h2>
          <p>Let's take a quick tour of the key features. We'll visit different sections to show you everything!</p>
          <p className="text-sm text-muted-foreground">This tour will take about a minute.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "[data-tour='stats-overview']",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Your Dashboard Overview</h3>
          <p>Track your key metrics at a glance: CVs processed, candidates scored, top matches, and processing times.</p>
        </div>
      ),
      placement: "auto",
      disableBeacon: true,
    },
    {
      target: "[data-tour='quick-actions']",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Quick Actions</h3>
          <p>Access common tasks with one click. Now let's explore each section in detail!</p>
        </div>
      ),
      placement: "auto",
      disableBeacon: true,
    },
    {
      target: "[data-tour='upload-cv']",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Parse CV</h3>
          <p>Upload individual CVs to extract structured data. Supports PDF, DOCX, DOC, and TXT formats up to 10MB.</p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: "[data-tour='create-role']",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Create Open Roles</h3>
          <p>Click here to create job openings. Track applications and organise candidates by position.</p>
        </div>
      ),
      placement: "left",
      disableBeacon: true,
    },
    {
      target: "[data-tour='candidates-list']",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">All Candidates</h3>
          <p>View all candidates across roles. Sort by score, filter by status, and manage your talent pipeline.</p>
        </div>
      ),
      placement: "auto",
      disableBeacon: true,
    },
    {
      target: "[data-tour='api-keys']",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Developer API Keys</h3>
          <p>Manage your API authentication keys for programmatic access to Qualifyr.AI.</p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: "[data-tour='analytics-metrics']",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Analytics & Insights</h3>
          <p>Monitor recruitment metrics, API performance, and track your hiring progress over time.</p>
        </div>
      ),
      placement: "auto",
      disableBeacon: true,
    },
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">You're All Set! 🚀</h2>
          <p>You now know the key features of Qualifyr.AI. Start by uploading a CV or creating your first open role.</p>
          <p className="text-sm text-muted-foreground">
            You can restart this tour anytime by clicking the "Start Tour" button in the sidebar.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    // Only handle STEP_AFTER events for navigation (when user clicks Next/Back)
    if (type === EVENTS.STEP_AFTER && (action === ACTIONS.NEXT || action === ACTIONS.PREV)) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);

      // Save tour state to localStorage so it persists across page navigation
      localStorage.setItem("onboarding_tour_active", "true");
      localStorage.setItem("onboarding_tour_step", nextIndex.toString());

      // Navigate based on next step
      if (nextIndex === 3) {
        // Step 3: Parse CV page
        navigate("/dashboard/parse");
      } else if (nextIndex === 4) {
        // Step 4: Open Roles page
        navigate("/dashboard/roles");
      } else if (nextIndex === 5) {
        // Step 5: Candidates page
        navigate("/dashboard/candidates");
      } else if (nextIndex === 6) {
        // Step 6: Developer page
        navigate("/dashboard/developer");
      } else if (nextIndex === 7) {
        // Step 7: Analytics page
        navigate("/dashboard/analytics");
      } else if (nextIndex === 8) {
        // Step 8: Back to Overview for completion
        navigate("/dashboard");
      } else if (nextIndex === 2 && action === ACTIONS.PREV) {
        // Going back to Overview from Parse CV
        navigate("/dashboard");
      } else {
        // No navigation needed, just update step index
        setStepIndex(nextIndex);
      }
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Mark tour as completed
      localStorage.setItem("onboarding_tour_completed", "true");
      localStorage.removeItem("onboarding_tour_active");
      localStorage.removeItem("onboarding_tour_step");
      setRunTour(false);
      setStepIndex(0);
      // Navigate back to dashboard
      navigate("/dashboard");
      onComplete?.();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      scrollToFirstStep
      disableScrolling={false}
      scrollOffset={120}
      spotlightClicks={false}
      disableOverlayClose
      hideCloseButton={false}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
          maxWidth: 400,
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: 6,
          padding: "8px 16px",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
};

// Helper function to reset tour and request it to start
export const resetOnboardingTour = () => {
  localStorage.removeItem("onboarding_tour_completed");
  localStorage.removeItem("onboarding_tour_active");
  localStorage.removeItem("onboarding_tour_step");
  localStorage.setItem("start_onboarding_tour", "true");
};
