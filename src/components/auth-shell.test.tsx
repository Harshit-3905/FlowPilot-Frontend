import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { LandingPage } from "@/components/landing-page";
import { AppShell } from "@/components/app-shell";

const API_URL = "http://localhost:3001";
const TEST_TOKEN = "clerk-test-session-jwt";

const { mockUseAuth, mockReplace } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockReplace: vi.fn(),
}));

let lastAuthHeader: string | null = null;

const server = setupServer(
  http.get(`${API_URL}/api/v1/me`, ({ request }) => {
    lastAuthHeader = request.headers.get("Authorization");
    if (lastAuthHeader !== `Bearer ${TEST_TOKEN}`) {
      return HttpResponse.json(
        { code: "unauthorized", message: "Missing or invalid token" },
        { status: 401 },
      );
    }
    return HttpResponse.json({ id: "user_db_1", email: "test@flowpilot.dev" });
  }),
);

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div data-testid="user-button" />,
  useAuth: mockUseAuth,
  Show: ({
    when,
    children,
  }: {
    when: "signed-in" | "signed-out";
    children: React.ReactNode;
  }) => {
    const auth = mockUseAuth() as { isSignedIn?: boolean | null } | undefined;
    const isSignedIn = Boolean(auth?.isSignedIn);
    const show = when === "signed-in" ? isSignedIn : !isSignedIn;
    return show ? <>{children}</> : null;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  lastAuthHeader = null;
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

describe("LandingPage (signed-out)", () => {
  it("renders FlowPilot chrome and auth CTAs", () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      getToken: async () => null,
    });

    render(<LandingPage />);

    expect(screen.getByTestId("landing")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FlowPilot" })).toBeInTheDocument();
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
    expect(screen.getByTestId("sign-up")).toBeInTheDocument();
  });
});

describe("AppShell (signed-in) + /me Authorization", () => {
  it("calls GET /api/v1/me with Authorization Bearer token", async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_clerk_1",
      getToken: async () => TEST_TOKEN,
    });

    render(<AppShell />);

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("me-panel")).toBeInTheDocument();
    });

    expect(lastAuthHeader).toBe(`Bearer ${TEST_TOKEN}`);
    expect(screen.getByTestId("me-id")).toHaveTextContent("user_db_1");
    expect(screen.getByTestId("me-email")).toHaveTextContent("test@flowpilot.dev");
    expect(screen.getByTestId("node-config-form-gpt_image_2")).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toBeInTheDocument();
    expect(screen.getByLabelText("Size")).toBeInTheDocument();
    expect(screen.getByLabelText("Quality")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of Images")).toBeInTheDocument();
    const advancedSection = screen.getByTestId("node-config-advanced");
    expect(advancedSection).not.toHaveAttribute("open");

    await userEvent.click(screen.getByText("Advanced"));

    expect(advancedSection).toHaveAttribute("open");
    expect(screen.getByLabelText("Background")).toBeInTheDocument();
    expect(screen.getByLabelText("Output Format")).toBeInTheDocument();
    expect(screen.getByLabelText("Output Compression")).toBeInTheDocument();
    expect(screen.getByText("in:prompt")).toBeInTheDocument();
    expect(screen.getByText("out:result")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
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
      expect(mockReplace).toHaveBeenCalledWith("/sign-in?redirect_url=%2Fapp");
    });
    expect(screen.queryByTestId("me-error")).not.toBeInTheDocument();
  });
});
