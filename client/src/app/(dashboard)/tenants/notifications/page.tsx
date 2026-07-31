"use client";

import React from "react";
import Header from "@/components/Header";
import Notifications from "@/components/Notifications";

const TenantNotifications = () => (
  <div className="dashboard-container">
    <Header
      title="Notifications"
      subtitle="Updates on your applications and messages"
    />
    <Notifications />
  </div>
);

export default TenantNotifications;