import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="portfolio"]',
    title: 'Your Portfolio',
    description: 'This is your personal portfolio page. Showcase your projects, repositories, and connections here.',
    position: 'bottom',
  },
  {
    target: '[data-tour="projects"]',
    title: 'Projects Tab',
    description: 'Create and manage your projects. Use Quick Create for fast project setup or Full Details for comprehensive projects.',
    position: 'bottom',
  },
  {
    target: '[data-tour="favorites"]',
    title: 'Favorite Projects',
    description: 'Bookmark interesting projects from other developers. Your favorites will appear in a dedicated tab.',
    position: 'bottom',
  },
  {
    target: '[data-tour="following"]',
    title: 'Following & Followers',
    description: 'Follow other developers to see their activity in your feed. Build your network and discover new projects.',
    position: 'bottom',
  },
  {
    target: '[data-tour="activity"]',
    title: 'Activity Feed',
    description: 'See recent activity from developers you follow. Stay updated on new projects and collaborations.',
    position: 'top',
  },
];

interface OnboardingTourProps {
  onComplete?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!user) return;
    
    // Check if user has completed the tour
    const tourCompleted = localStorage.getItem(`onboarding_tour_${user.id}`);
    if (!tourCompleted) {
      // Delay start to let page render
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const step = tourSteps[currentStep];
      const element = document.querySelector(step.target);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        let top = 0;
        let left = 0;

        switch (step.position) {
          case 'bottom':
            top = rect.bottom + scrollY + 12;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case 'top':
            top = rect.top + scrollY - 12;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case 'left':
            top = rect.top + scrollY + rect.height / 2;
            left = rect.left + scrollX - 12;
            break;
          case 'right':
            top = rect.top + scrollY + rect.height / 2;
            left = rect.right + scrollX + 12;
            break;
        }

        setTooltipPosition({ top, left });
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    if (user) {
      localStorage.setItem(`onboarding_tour_${user.id}`, 'completed');
    }
    setIsActive(false);
    onComplete?.();
  };

  const skipTour = () => {
    completeTour();
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];

  return createPortal(
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
        onClick={skipTour}
      />

      {/* Spotlight on target element */}
      <style>
        {`
          ${step.target} {
            position: relative;
            z-index: 101 !important;
            box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 20px 4px hsl(var(--primary) / 0.3) !important;
            border-radius: 8px;
          }
        `}
      </style>

      {/* Tooltip */}
      <div
        className="fixed z-[102] w-80 animate-scale-in"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: step.position === 'bottom' || step.position === 'top' 
            ? 'translateX(-50%)' 
            : step.position === 'left' 
              ? 'translateX(-100%)' 
              : 'translateX(0)',
          marginTop: step.position === 'top' ? '-100%' : 0,
        }}
      >
        <Card className="border-primary/50 shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="mb-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Step {currentStep + 1} of {tourSteps.length}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={skipTour}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex gap-1">
                {tourSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <Button size="sm" onClick={handleNext}>
                {currentStep === tourSteps.length - 1 ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Done
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>,
    document.body
  );
};

// Hook to manually trigger the tour
export const useOnboardingTour = () => {
  const { user } = useAuth();

  const resetTour = () => {
    if (user) {
      localStorage.removeItem(`onboarding_tour_${user.id}`);
      window.location.reload();
    }
  };

  const isTourCompleted = () => {
    if (!user) return false;
    return localStorage.getItem(`onboarding_tour_${user.id}`) === 'completed';
  };

  return { resetTour, isTourCompleted };
};
