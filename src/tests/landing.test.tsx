import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/(marketing)/page";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

describe("Landing Page & Marketing Experience", () => {
  it("renders the primary headline and supporting copy", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /Breathe Smarter\.\s*Live Healthier\./i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Your intelligent companion for navigating air pollution/i)
    ).toBeInTheDocument();
  });

  it("renders all six core feature cards", () => {
    render(<LandingPage />);

    expect(screen.getByText("Live Air Quality Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Gemini AI Pollution Assistant")).toBeInTheDocument();
    expect(screen.getByText("Smart Daily Routine Planner")).toBeInTheDocument();
    expect(screen.getByText("Indoor Air Quality Optimizer")).toBeInTheDocument();
    expect(screen.getByText("Sustainable Alternative Finder")).toBeInTheDocument();
    expect(screen.getByText("Family Protection Mode")).toBeInTheDocument();
  });

  it("clearly displays DEMO DATA labels to prevent misleading claims", () => {
    render(<LandingPage />);

    const demoBadges = screen.getAllByText(/DEMO DATA/i);
    expect(demoBadges.length).toBeGreaterThan(0);
  });

  it("renders the four-step How It Works guide", () => {
    render(<LandingPage />);

    expect(screen.getByText("Choose Your Location")).toBeInTheDocument();
    expect(screen.getByText("Understand Your Air Quality")).toBeInTheDocument();
    expect(screen.getByText("Get Personalized AI Guidance")).toBeInTheDocument();
    expect(screen.getByText("Make Smarter Everyday Choices")).toBeInTheDocument();
  });

  it("renders the final CTA section with exact required text", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /Take control of the air you breathe\./i })
    ).toBeInTheDocument();
  });

  it("renders Navbar and Footer with semantic navigation links", () => {
    render(
      <>
        <Navbar />
        <Footer />
      </>
    );

    expect(screen.getByRole("link", { name: /BreatheWise AI Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Home$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Features$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^How It Works$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^About$/i })).toBeInTheDocument();
  });
});

