"use client";

import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/AppSidebar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import React, { useEffect } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { usePathname, useRouter } from "next/navigation";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = authUser?.userRole?.toLowerCase();
  const isMismatched =
    (userRole === "manager" && pathname.startsWith("/tenants")) ||
    (userRole === "tenant" && pathname.startsWith("/managers"));

  useEffect(() => {
    if (isMismatched) {
      router.push(
        userRole === "manager" ? "/managers/properties" : "/tenants/favorites",
        { scroll: false },
      );
    }
  }, [isMismatched, userRole, router]);

  if (authLoading || isMismatched) return <>Loading...</>;
  if (!authUser?.userRole) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-primary-100">
        <Navbar />
        <div style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}>
          <main className="flex">
            <Sidebar userType={userRole === "manager" ? "manager" : "tenant"} />{" "}
            <div className="grow min-w-0 transition-all duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
