import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";

const { mockUseAuth, mockReplace, mockPathname } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockReplace: vi.fn(),
  mockPathname: vi.fn(() => "/"),
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => <div data-testid="user-button" />,
  useAuth: mockUseAuth,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => mockPathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  MiniMap: () => <div data-testid="minimap" />,
  Controls: () => <div data-testid="rf-controls" />,
  Background: () => <div data-testid="rf-background" />,
  BackgroundVariant: { Dots: "dots" },
  applyNodeChanges: vi.fn((changes: unknown[], nodes: unknown[]) => nodes),
  applyEdgeChanges: vi.fn((changes: unknown[], edges: unknown[]) => edges),
  Handle: ({ id }: { id?: string }) => <div data-testid={`handle-${id}`} />,
  Position: { Left: "left", Right: "right" },
}));

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockPathname.mockReturnValue("/");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("AppShell (signed-in) — layout shell", () => {
  it("renders icon rail and children", () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_clerk_1",
      getToken: async () => "tok",
    });

    render(
      <AppShell>
        <div data-testid="child-content">content</div>
      </AppShell>,
    );

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("app-rail")).toBeInTheDocument();
    const brand = screen.getByRole("link", { name: "FlowPilot" });
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute("href", "/");
    const apiKeysNav = screen.getByTestId("nav-api-keys");
    expect(apiKeysNav).toHaveAttribute("href", "/settings/api-keys");
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.queryByTestId("rail-add-node")).not.toBeInTheDocument();
  });

  it("shows add/search rail actions on editor routes only", () => {
    mockPathname.mockReturnValue("/workflows/wf_1");
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_clerk_1",
      getToken: async () => "tok",
    });

    render(
      <AppShell>
        <div data-testid="child-content">editor</div>
      </AppShell>,
    );

    expect(screen.getByTestId("rail-add-node")).toBeInTheDocument();
    expect(screen.getByTestId("rail-search-nodes")).toBeInTheDocument();
  });

  it("redirects to sign-in when session is gone", async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      getToken: async () => null,
    });

    render(<AppShell />);

    expect(screen.getByTestId("app-shell-redirecting")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/sign-in?redirect_url=%2F");
    });
  });
});
