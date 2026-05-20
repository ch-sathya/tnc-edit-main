import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import PageHead from "@/components/PageHead";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <PageHead title="Page not found" description="The page you're looking for doesn't exist." noIndex />
      <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-3">404</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Page not found</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't find <span className="font-mono text-foreground">{location.pathname}</span>.
            It may have moved, or never existed.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go back
            </Button>
            <Button size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" /> Home
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
