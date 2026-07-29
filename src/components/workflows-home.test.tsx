import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { WorkflowsHome } from "@/components/workflows-home";
import { workflowHandlers, workflowFixtures } from "@/test/msw-handlers";

// ── mocks ──────────────────────────────────────────────────────────────────

const { mockGetToken, mockPush } = vi.hoisted(() => ({
  mockGetToken: vi.fn(async () => "test-token"),
  mockPush: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// ── MSW server ──────────────────────────────────────────────────────────────

const server = setupServer(...workflowHandlers);

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

// ── tests ───────────────────────────────────────────────────────────────────

describe("WorkflowsHome", () => {
  it("renders multiple distinct workflow cards from MSW list", async () => {
    expect(workflowFixtures.list.length).toBeGreaterThanOrEqual(2);

    render(<WorkflowsHome />);

    expect(screen.getByTestId("workflows-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("workflows-list")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Your Workflows" })).toBeInTheDocument();

    for (const wf of workflowFixtures.list) {
      expect(screen.getByTestId(`workflow-card-${wf.id}`)).toBeInTheDocument();
      expect(screen.getByText(wf.name)).toBeInTheDocument();
    }

    expect(screen.getByTestId("workflow-card-wf_1")).not.toBe(
      screen.getByTestId("workflow-card-wf_2"),
    );
  });

  it("navigates each card to its own canvas route", async () => {
    render(<WorkflowsHome />);

    await waitFor(() =>
      expect(screen.getByTestId("workflow-card-wf_1")).toBeInTheDocument(),
    );

    const card1 = screen.getByTestId("workflow-card-wf_1");
    await userEvent.click(card1.querySelector("button")!);
    expect(mockPush).toHaveBeenCalledWith("/workflows/wf_1");

    mockPush.mockClear();

    const card2 = screen.getByTestId("workflow-card-wf_2");
    await userEvent.click(card2.querySelector("button")!);
    expect(mockPush).toHaveBeenCalledWith("/workflows/wf_2");
  });

  it("New Workflow button POSTs and navigates to new workflow", async () => {
    render(<WorkflowsHome />);

    await waitFor(() =>
      expect(screen.getByTestId("new-workflow-btn")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByTestId("new-workflow-btn"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        `/workflows/${workflowFixtures.created.id}`,
      );
    });
  });

  it("shows empty state when list is empty", async () => {
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.get("http://localhost:3001/api/v1/workflows", () =>
        HttpResponse.json({ workflows: [] }),
      ),
    );

    render(<WorkflowsHome />);

    await waitFor(() => {
      expect(screen.getByTestId("workflows-empty")).toBeInTheDocument();
    });
  });
});
