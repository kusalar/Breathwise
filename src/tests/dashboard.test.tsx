import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { LocationSelector } from "@/components/shared/location-selector";
import { environmentalCache } from "@/lib/cache/environmental-cache";
import { stubOpenMeteoFetch } from "./fixtures/open-meteo";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("Dashboard Foundation & Experience", () => {
  beforeEach(() => {
    environmentalCache.clear();
    stubOpenMeteoFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    environmentalCache.clear();
  });
  it("renders the dashboard welcome banner targeting Siliguri baseline", async () => {
    render(<DashboardView />);

    expect(
      await screen.findByText(/Air Quality for Siliguri/i, {}, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Mahananda Basin/i)).toBeInTheDocument();
  });

  it("renders CPCB AQI value and category status", async () => {
    render(<DashboardView />);

    expect(
      await screen.findByText(/Indicative Air Quality Index/i, {}, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Dominant:/i)).toBeInTheDocument();
    expect(screen.getAllByText("PM2.5").length).toBeGreaterThan(0);
  });

  it("renders all 6 pollutant metrics cards with standard limits", async () => {
    render(<DashboardView />);

    expect(
      await screen.findByText("PM10", {}, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(screen.getAllByText("PM2.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NO₂").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SO₂").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("O₃").length).toBeGreaterThan(0);
  });

  it("renders Gemini AI atmospheric insight panel", async () => {
    render(<DashboardView />);

    expect(
      await screen.findByText(/Gemini AI Atmospheric & Health Synthesis/i, {}, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tailored Recommendation for Right Now/i)
    ).toBeInTheDocument();
  });

  it("renders Today's recommended routine and indoor air preview", async () => {
    render(<DashboardView />);

    expect(
      await screen.findByText(/Today's Recommended Routine/i, {}, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Indoor Air Quality Optimizer/i)).toBeInTheDocument();
  });

  it("renders sidebar navigation links with 10 required routes", () => {
    render(<DashboardSidebar />);

    const requiredLinks = [
      "Overview",
      "Air Quality",
      "AI Assistant",
      "Daily Planner",
      "Indoor Air",
      "Sustainable Choices",
      "Family Protection",
      "Impact Tracker",
      "Community Hub",
      "Settings",
    ];

    requiredLinks.forEach((linkText) => {
      expect(screen.getByText(linkText)).toBeInTheDocument();
    });
  });

  it("supports interactive location selection with Indian cities", () => {
    const handleLocationChange = vi.fn();
    render(<LocationSelector onLocationChange={handleLocationChange} />);

    // Click trigger button
    const button = screen.getByRole("button", { name: /Current location is Siliguri/i });
    fireEvent.click(button);

    // Listbox should be visible
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText(/Delhi/i)).toBeInTheDocument();
    expect(screen.getByText(/Kolkata/i)).toBeInTheDocument();
  });
});
