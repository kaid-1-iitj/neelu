import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, NavLink } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-foreground/70 hover:text-foreground",
  );

export default function SiteHeader() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary shadow-[0_0_20px_rgba(138,43,226,0.6)]" />
          <span className="text-lg font-bold tracking-tight">Society Ledgers</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/bills" className={navLinkClass}>
            Bills
          </NavLink>
          <NavLink to="/reports" className={navLinkClass}>
            Reports
          </NavLink>
          {user?.role === "Admin" ? (
            <NavLink to="/agents" className={navLinkClass}>
              Agents
            </NavLink>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Badge variant="secondary" className="uppercase tracking-wide">
                {user.role}
              </Badge>
              <Link to="/dashboard">
                <Button variant="secondary" className="bg-secondary">Dashboard</Button>
              </Link>
              <Button onClick={() => signOut()} className="bg-primary">Sign out</Button>
            </>
          ) : (
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(138,43,226,0.35)]">
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
