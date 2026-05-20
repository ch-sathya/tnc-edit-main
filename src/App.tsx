import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { NoiseOverlay } from "@/components/animations/FluidBackground";
import { AmbientBackground } from "@/components/animations/AmbientBackground";
import { AmbientThemeProvider } from "@/contexts/AmbientThemeContext";
import { AmbientThemeSwitcher } from "@/components/AmbientThemeSwitcher";

// Eager (light, frequently-used)
import Index from "./pages/Index";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy (heavy or less-frequent)
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Editor = lazy(() => import("./pages/Editor"));
const Collaborate = lazy(() => import("./pages/Collaborate"));
const CollaborationRoom = lazy(() => import("./pages/CollaborationRoom"));
const Community = lazy(() => import("./pages/Community"));
const Connections = lazy(() => import("./pages/Connections"));
const News = lazy(() => import("./pages/News"));
const NewsArticle = lazy(() => import("./components/NewsArticle"));
const UsernameSetup = lazy(() => import("./pages/UsernameSetup"));
const Settings = lazy(() => import("./pages/Settings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const JoinRoom = lazy(() => import("./pages/JoinRoom"));
const Pricing = lazy(() => import("./pages/Pricing"));
const VibeCode = lazy(() => import("./pages/VibeCode"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const SharedSnippet = lazy(() => import("./pages/SharedSnippet"));
const Notifications = lazy(() => import("./pages/Notifications"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-transparent flex items-center justify-center">
    <div className="flex items-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm">Loading…</span>
    </div>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <TopLoadingBar />
      <div
        key={location.pathname}
        className="min-h-screen animate-fade-in"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/dashboard" element={<Navigate to="/portfolio" replace />} />
            <Route path="/profile" element={<Navigate to="/portfolio" replace />} />
            <Route path="/messages" element={<Navigate to="/connections" replace />} />
            <Route path="/groups" element={<Navigate to="/community" replace />} />
            <Route path="/groups/:id" element={<Navigate to="/community" replace />} />
            <Route path="/@:username" element={<Portfolio />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/editor/:projectId" element={<Editor />} />
            <Route path="/collaborate" element={<Collaborate />} />
            <Route path="/collaborate/join" element={<JoinRoom />} />
            <Route path="/collaborate/:roomId" element={<CollaborationRoom />} />
            <Route path="/community" element={<Community />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsArticle />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup-username" element={<UsernameSetup />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/vibe-code" element={<VibeCode />} />
            <Route path="/snippet/:shortCode" element={<SharedSnippet />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
};

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AmbientThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AmbientBackground />
            <NoiseOverlay />
            <SmoothCursor />
            <AnimatedRoutes />
            <AmbientThemeSwitcher />
          </BrowserRouter>
        </TooltipProvider>
      </AmbientThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
