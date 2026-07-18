import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { NoiseOverlay, SmoothCursor } from "@/components/animations/FluidBackground";
import { AmbientBackground } from "@/components/animations/AmbientBackground";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Portfolio from "./pages/Portfolio";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Editor from "./pages/Editor";
import Collaborate from "./pages/Collaborate";
import CollaborationRoom from "./pages/CollaborationRoom";
import Community from "./pages/Community";
import Connections from "./pages/Connections";
import News from "./pages/News";
import NewsArticle from "./components/NewsArticle";
import Auth from "./pages/Auth";
import UsernameSetup from "./pages/UsernameSetup";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import JoinRoom from "./pages/JoinRoom";
import Pricing from "./pages/Pricing";
import VibeCode from "./pages/VibeCode";
import NotFound from "./pages/NotFound";
import UserProfile from "./pages/UserProfile";
import SharedSnippet from "./pages/SharedSnippet";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <motion.div
      className="flex items-center gap-3 text-muted-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm">Loading…</span>
    </motion.div>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  // Reset scroll on route change for clean transitions
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <>
      <TopLoadingBar />
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/dashboard" element={<Portfolio />} />
            <Route path="/@:username" element={<UserProfile />} />
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
            {/* Fallback: catches /@username style URLs since React Router v6 requires
                dynamic params to occupy a whole segment. */}
            <Route path="/:handle" element={<UserProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </>
  );
};

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AmbientBackground />
          <NoiseOverlay />
          <SmoothCursor />
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
