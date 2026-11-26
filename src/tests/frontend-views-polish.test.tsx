import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IndoorAirView } from "@/components/dashboard/indoor-air-view";
import { CommunityHubView } from "@/components/dashboard/community-hub-view";
import { LocationProvider } from "@/context/location-context";

describe("Frontend Alignment & Interactive Views", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("IndoorAirView calculates HEPA CADR dynamically from room dimensions", () => {
    render(<IndoorAirView />);

    expect(screen.getByText("HEPA Purifier CADR Room Calculator")).toBeTruthy();
    expect(screen.getByText("168 sq ft")).toBeTruthy();

    const lengthInput = screen.getByLabelText("Length (ft)") as HTMLInputElement;
    fireEvent.change(lengthInput, { target: { value: "20" } });

    expect(screen.getByText("240 sq ft")).toBeTruthy();
  });

  it("IndoorAirView persists completed indoor protection checklist items", () => {
    render(<IndoorAirView />);

    const checkbox = screen.getByLabelText(/Damp-mop floors instead of dry sweeping/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText("1/5 Done")).toBeTruthy();
  });

  it("CommunityHubView allows submitting hotspot reports and toggling clean-air pledges", () => {
    render(
      <LocationProvider>
        <CommunityHubView />
      </LocationProvider>
    );

    const localityInput = screen.getByLabelText("Neighborhood / Landmark");
    const descInput = screen.getByLabelText("Observation Details");

    fireEvent.change(localityInput, { target: { value: "Sevoke Road" } });
    fireEvent.change(descInput, { target: { value: "Dry leaf burning near park" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Hotspot Report/i }));

    expect(screen.getByText(/Sevoke Road/i)).toBeTruthy();
    expect(screen.getByText("Dry leaf burning near park")).toBeTruthy();

    const pledgeBtn = screen.getByRole("button", { name: /Zero Dry-Leaf Burning/i });
    fireEvent.click(pledgeBtn);
    expect(pledgeBtn.getAttribute("aria-pressed")).toBe("true");
  });
});
