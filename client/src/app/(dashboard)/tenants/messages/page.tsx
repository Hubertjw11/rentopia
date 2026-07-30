"use client";

import React, { Suspense } from "react";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import Messages from "@/components/Messages";

const TenantMessages = () => (
  <div className="dashboard-container">
    <Header title="Messages" subtitle="Chat with your property managers" />
    <Suspense fallback={<Loading />}>
      <Messages userType="tenant" />
    </Suspense>
  </div>
);

export default TenantMessages;