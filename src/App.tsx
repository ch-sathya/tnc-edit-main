import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import { Loader2 } from "lucide-react";
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
import NotFound from "./pages/NotFound";
import UserProfile from "./pages/UserProfile";

const queryClient = new QueryClient();

// Code-style loading indicator
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 h-8 bg-emerald-500 rounded-sm animate-pulse"
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s',
            }}
          />
        ))}
      </div>
      <span className="text-emerald-500 font-mono text-sm">Loading...</span>
    </div>
  </div>
);

// Smooth animated routes wrapper
const AnimatedRoutes = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exit');
    }
  }, [location, displayLocation]);

  const handleTransitionEnd = () => {
    if (transitionStage === 'exit') {
      setDisplayLocation(location);
      setTransitionStage('enter');
    }
  };

  return (
    <div 
      className={`min-h-screen transition-all duration-300 ease-out ${
        transitionStage === 'exit' 
          ? 'opacity-0 translate-y-2' 
          : 'opacity-100 translate-y-0'
      }`}
      onTransitionEnd={handleTransitionEnd}
    >
      <Suspense fallback={<PageLoader />}>
        <Routes location={displayLocation}>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
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
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => {
  // Ensure dark mode is set immediately to prevent white flash
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
