"use client";

import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "../dashboard/auth/AuthProvider";
import { RequireAuth } from "../dashboard/auth/RequireAuth";
import { AppLayout } from "../dashboard/components/layout/AppLayout";
import { AnalyticsPage } from "../dashboard/routes/analytics/AnalyticsPage";
import { ConversationsPage } from "../dashboard/routes/conversations/ConversationsPage";
import { LocationsPage } from "../dashboard/routes/locations/LocationsPage";
import { LoginPage } from "../dashboard/routes/login/LoginPage";
import { MediaPage } from "../dashboard/routes/media/MediaPage";
import { OverviewPage } from "../dashboard/routes/overview/OverviewPage";
import { PersonalityPage } from "../dashboard/routes/personality/PersonalityPage";
import { PromotionsPage } from "../dashboard/routes/promotions/PromotionsPage";
import { RegisterPage } from "../dashboard/routes/register/RegisterPage";
import { SettingsPage } from "../dashboard/routes/settings/SettingsPage";
import { TrainingPage } from "../dashboard/routes/training/TrainingPage";
import { ChatView } from "../customer/routes/ChatView";

const queryClient = new QueryClient();

export default function ClientApp() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/b/:businessSlug/:locationSlug" element={<ChatView />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="training" element={<TrainingPage />} />
              <Route path="personality" element={<PersonalityPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="promotions" element={<PromotionsPage />} />
              <Route path="media" element={<MediaPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
