import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./routes/login/LoginPage";
import { RegisterPage } from "./routes/register/RegisterPage";
import { OverviewPage } from "./routes/overview/OverviewPage";
import { ConversationsPage } from "./routes/conversations/ConversationsPage";
import { AnalyticsPage } from "./routes/analytics/AnalyticsPage";
import { TrainingPage } from "./routes/training/TrainingPage";
import { PersonalityPage } from "./routes/personality/PersonalityPage";
import { LocationsPage } from "./routes/locations/LocationsPage";
import { PromotionsPage } from "./routes/promotions/PromotionsPage";
import { MediaPage } from "./routes/media/MediaPage";
import { SettingsPage } from "./routes/settings/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
