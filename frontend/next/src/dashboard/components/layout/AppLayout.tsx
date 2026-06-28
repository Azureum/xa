import type { ComponentType, SVGProps } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import {
  AnalyticsIcon,
  ConversationsIcon,
  LocationsIcon,
  LogoutIcon,
  MediaIcon,
  OverviewIcon,
  PersonalityIcon,
  PromotionsIcon,
  SettingsIcon,
  TrainingIcon,
} from "../icons";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { to: "/dashboard", label: "Overview", icon: OverviewIcon, end: true },
      { to: "/dashboard/conversations", label: "Conversations", icon: ConversationsIcon },
      { to: "/dashboard/analytics", label: "Analytics", icon: AnalyticsIcon },
    ],
  },
  {
    title: "Training",
    items: [
      { to: "/dashboard/training", label: "Training Center", icon: TrainingIcon },
      { to: "/dashboard/personality", label: "AI Personality", icon: PersonalityIcon },
    ],
  },
  {
    title: "Manage",
    items: [
      { to: "/dashboard/locations", label: "Locations", icon: LocationsIcon },
      { to: "/dashboard/promotions", label: "Promotions", icon: PromotionsIcon },
      { to: "/dashboard/media", label: "Media", icon: MediaIcon },
      { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function AppLayout() {
  const { business, user, logout } = useAuth();
  const businessName = business?.name ?? "AI Host";
  const initial = businessName.charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">{initial}</span>
          <span className="sidebar-brand-name">{businessName}</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
                  >
                    <Icon className="sidebar-link-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">{(user?.email ?? "?").charAt(0).toUpperCase()}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
          <button type="button" className="btn btn-secondary sidebar-logout" onClick={logout}>
            <LogoutIcon className="sidebar-link-icon" />
            Log out
          </button>
        </div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
