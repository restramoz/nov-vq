import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <Shield className="mx-auto h-16 w-16 rune-text" />
        <h1 className="text-6xl font-display font-bold rune-text">404</h1>
        <p className="text-xl text-muted-foreground font-display">Gulungan ini tidak ditemukan...</p>
        <div className="flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
        <Button asChild className="rune-glow">
          <Link to="/">ᛟ Kembali ke Perpustakaan</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
