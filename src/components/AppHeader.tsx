import { Link, useLocation } from "react-router-dom";
import { Plus, Settings, Shield, BookOpen, Users, Globe, Feather, Music } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { NavLink } from "./NavLink";

export function AppHeader() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Shield className="h-6 w-6 rune-text transition-all group-hover:scale-110" />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold rune-text font-rune">ᛟ</span>
          </div>
          <span className="font-display text-lg font-bold text-foreground hidden sm:inline">
            Novel <span className="rune-text">AI</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/" className={`px-3 py-1.5 rounded-md transition-colors ${isActive("/") ? "bg-primary/10 rune-text font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="default" size="sm" className="rune-glow h-8 text-xs">
            <Link to="/create">
              <Plus className="mr-1 h-3.5 w-3.5" /> Tempa
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
