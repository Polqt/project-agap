"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useAuthClient } from "@/lib/auth-client";
import Header from "./header";

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useAuthClient();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isLogin = pathname === "/login";

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === "/login") {
        signOut();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [signOut]);

  if (isDashboard || isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="grid grid-rows-[auto_1fr] h-svh">
      <Header />
      {children}
    </div>
  );
}
