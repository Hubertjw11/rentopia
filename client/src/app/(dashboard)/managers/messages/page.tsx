"use client";

import React, { Suspense } from "react";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import Messages from "@/components/Messages";

const ManagerMessages = () => (
  <div className="dashboard-container">
    <Header title="Messages" subtitle="Chat with tenants about your properties" />
    <Suspense fallback={<Loading />}>
      <Messages userType="manager" />
    </Suspense>
  </div>
);

export default ManagerMessages;