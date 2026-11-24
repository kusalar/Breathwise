import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";

describe("Reusable UI Components", () => {
  it("renders buttons with accessible variants and handles disabled state", () => {
    const { rerender } = render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /Click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();

    rerender(<Button disabled>Disabled Action</Button>);
    expect(screen.getByRole("button", { name: /Disabled Action/i })).toBeDisabled();
  });

  it("renders badges with proper variant styles", () => {
    render(
      <div>
        <Badge variant="default">Normal</Badge>
        <Badge variant="warning">Warning Level</Badge>
        <Badge variant="demo">Demo Badge</Badge>
      </div>
    );

    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Warning Level")).toBeInTheDocument();
    expect(screen.getByText("Demo Badge")).toBeInTheDocument();
  });

  it("renders Card container with header and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title Test</CardTitle>
        </CardHeader>
        <CardContent>Card body content</CardContent>
      </Card>
    );

    expect(screen.getByText("Card Title Test")).toBeInTheDocument();
    expect(screen.getByText("Card body content")).toBeInTheDocument();
  });

  it("renders Alert with role='alert' for assistive technologies", () => {
    render(
      <Alert variant="warning">
        <AlertTitle>Attention</AlertTitle>
        <AlertDescription>Inversion smog detected.</AlertDescription>
      </Alert>
    );

    const alertEl = screen.getByRole("alert");
    expect(alertEl).toBeInTheDocument();
    expect(screen.getByText("Attention")).toBeInTheDocument();
    expect(screen.getByText("Inversion smog detected.")).toBeInTheDocument();
  });

  it("renders DemoDataBadge with screen reader label and uppercase text", () => {
    render(<DemoDataBadge />);

    const badge = screen.getByText("DEMO DATA");
    expect(badge).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Demonstration data notice: not a live physical measurement/i)
    ).toBeInTheDocument();
  });

  it("renders theme toggle button with accessible label", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: /switch to (dark|light) mode|toggle/i })
    ).toBeInTheDocument();
  });
});
