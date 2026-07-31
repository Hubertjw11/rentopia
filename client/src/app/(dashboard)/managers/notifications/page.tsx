"use client";

import React from "react";
import Header from "@/components/Header";
import Notifications from "@/components/Notifications";

const ManagerNotifications = () => (
  <div className="dashboard-container">
    <Header
      title="Notifications"
      subtitle="Updates on your properties and applicants"
    />
    <Notifications />
  </div>
);

export default ManagerNotifications;