import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function useAuth(requiredRole?: "recruiter" | "jobseeker") {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    // Check if user is already on a login page
    const currentPath = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
    const isOnLoginPage = currentPath.startsWith("/auth/login") || 
                         currentPath.startsWith("/auth/jobseeker/login") || 
                         currentPath.startsWith("/auth/recruiter/login") ||
                         currentPath.startsWith("/auth/register") ||
                         currentPath.startsWith("/auth/jobseeker/register") ||
                         currentPath.startsWith("/auth/recruiter/register");

    // Define public routes that should never redirect authenticated users
    const publicRoutes = [
      "/",
      "/jobs",
      "/companies",
      "/posts",
      "/about",
      "/contact"
    ];
    const isOnPublicRoute = publicRoutes.some(route => 
      currentPath === route || currentPath.startsWith(route + "/")
    );

    if (status === "unauthenticated") {
      // Only redirect to login if a specific role is required (protected page)
      if (requiredRole && !isOnLoginPage) {
        router.push("/auth/login");
      }
      return;
    }

    if (status === "authenticated" && session?.user) {
      const userRole = (session.user as { role?: string })?.role;

      // If a specific role is required, check if user has that role
      if (requiredRole && userRole !== requiredRole) {
        // Only redirect if NOT on a public route
        if (!isOnPublicRoute) {
          // Redirect to appropriate dashboard based on user's role
          if (userRole === "recruiter") {
            router.push("/dashboard/recruiter");
          } else if (userRole === "jobseeker") {
            router.push("/dashboard/job-seeker");
          }
        }
        return;
      }

      // If user is authenticated and on login page, redirect to appropriate dashboard
      if (isOnLoginPage) {
        if (userRole === "recruiter") {
          router.push("/dashboard/recruiter");
        } else if (userRole === "jobseeker") {
          router.push("/dashboard/job-seeker");
        }
      }
    }
  }, [session, status, router, requiredRole, pathname]);

  return {
    session,
    status,
    user: session?.user,
    role: (session?.user as { role?: string })?.role,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  };
} 