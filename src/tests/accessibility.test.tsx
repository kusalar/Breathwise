import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import * as fs from "fs";
import * as path from "path";
import axe from "axe-core";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SettingsView } from "@/components/dashboard/settings-view";
import { ImpactTrackerView } from "@/components/dashboard/impact-tracker-view";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { LocationProvider } from "@/context/location-context";
import { useEscapeKey, useFocusTrap } from "@/hooks/use-dismissable";
import LoginPage from "@/app/login/page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

async function runAxeAudit(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not compute layout styles or canvas pixel contrast
      "color-contrast": { enabled: false },
    },
  });
  return results.violations;
}

function FocusTrapHarness({ open, onClose }: { open: boolean; onClose: () => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useEscapeKey(open, onClose);
  useFocusTrap(containerRef, open);

  if (!open) return null;
  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label="Dialog Harness">
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  );
}

describe("Accessibility & Keyboard Navigation Audits", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("breathewise_onboarding_completed", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/sustainability")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ actions: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ authenticated: false }),
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Navbar and Footer pass axe-core audits with zero violations", async () => {
    const navRender = render(<Navbar />);
    expect(await runAxeAudit(navRender.container)).toEqual([]);
    navRender.unmount();

    const footerRender = render(<Footer />);
    expect(await runAxeAudit(footerRender.container)).toEqual([]);
  });

  it("LoginPage passes axe-core and avoids nested interactive links/buttons", async () => {
    const { container } = render(<LoginPage />);
    expect(container.querySelector("a button, button a")).toBeNull();
    expect(await runAxeAudit(container)).toEqual([]);
  });

  it("SettingsView passes axe-core with associated form labels", async () => {
    const { container } = render(
      <LocationProvider>
        <main>
          <SettingsView />
        </main>
      </LocationProvider>
    );

    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Select Base City")).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/session");
    });
    expect(await runAxeAudit(container)).toEqual([]);
  });

  it("ImpactTrackerView passes axe-core with associated form labels", async () => {
    const { container } = render(
      <main>
        <ImpactTrackerView />
      </main>
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/sustainability");
    });
    fireEvent.click(screen.getByRole("button", { name: /Log Custom Action/i }));
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Action Details & Context")).toBeInTheDocument();
    expect(await runAxeAudit(container)).toEqual([]);
  });

  it("OnboardingModal passes axe-core and dismisses on Escape", async () => {
    localStorage.removeItem("breathewise_onboarding_completed");

    const { container } = render(
      <LocationProvider>
        <OnboardingModal />
      </LocationProvider>
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(await runAxeAudit(container)).toEqual([]);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("useEscapeKey and useFocusTrap handle Escape and Tab wrapping", () => {
    const onClose = vi.fn();
    render(<FocusTrapHarness open onClose={onClose} />);

    const firstBtn = screen.getByRole("button", { name: "First" });
    const lastBtn = screen.getByRole("button", { name: "Last" });
    expect(document.activeElement).toBe(firstBtn);

    lastBtn.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(firstBtn);

    firstBtn.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("enforces minimum 12px typography and prohibits buttons inside Link across UI source", () => {
    const roots = [
      path.join(process.cwd(), "src", "components"),
      path.join(process.cwd(), "src", "app"),
    ];

    const collectFiles = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...collectFiles(full));
        } else if (entry.name.endsWith(".tsx")) {
          files.push(full);
        }
      }
      return files;
    };

    const tsxFiles = roots.flatMap(collectFiles);
    const sub12pxPattern = /\btext-\[(?:[0-9]|1[01])px\]/;
    const linkWithButtonPattern = /<Link\b[^>]*>(?:(?!<\/Link>)[\s\S])*?<[Bb]utton\b/;

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content, `Sub-12px text class in ${file}`).not.toMatch(sub12pxPattern);
      expect(content, `Button nested inside Link in ${file}`).not.toMatch(linkWithButtonPattern);
    }
  });
});
