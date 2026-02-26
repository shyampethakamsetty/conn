"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  Briefcase,
  Users,
  Sparkles,
  User,
  LayoutDashboard,
} from "lucide-react";

const navItems: { name: string; href: string; icon: React.ElementType }[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Community", href: "/posts", icon: Users },
  { name: "AI Tools", href: "/ai-tools", icon: Sparkles },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Hide on auth pages
  const isAuthRoute = pathname?.startsWith("/auth");
  const isDashboardRoute = pathname?.startsWith("/dashboard");
  if (isAuthRoute) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const profileHref = session
    ? (session.user as { role?: string })?.role === "recruiter"
      ? "/dashboard/recruiter"
      : "/dashboard/job-seeker"
    : "/auth/login";

  const profileLabel = session ? "Profile" : "Login";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map(({ name, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 rounded-lg transition-colors touch-manipulation ${
              isActive(href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isActive(href) ? "page" : undefined}
          >
            <Icon className="w-6 h-6 shrink-0" aria-hidden />
            <span className="text-[10px] font-medium truncate max-w-[72px]">
              {name}
            </span>
          </Link>
        ))}
        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 rounded-lg transition-colors touch-manipulation ${
            isActive(profileHref) || isDashboardRoute
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-current={isActive(profileHref) ? "page" : undefined}
        >
          {session ? (
            <LayoutDashboard className="w-6 h-6 shrink-0" aria-hidden />
          ) : (
            <User className="w-6 h-6 shrink-0" aria-hidden />
          )}
          <span className="text-[10px] font-medium truncate max-w-[72px]">
            {profileLabel}
          </span>
        </Link>
      </div>
    </nav>
  );
}
