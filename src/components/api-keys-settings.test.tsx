import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { ApiKeysSettings } from "@/components/api-keys-settings";
import {
  apiKeyFixtures,
  apiKeysHandlers,
  resetApiKeysMswState,
} from "@/test/msw-handlers";

const mockGetToken = vi.fn(async () => "tok");

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: mockGetToken,
  }),
}));

const server = setupServer(...apiKeysHandlers);

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  resetApiKeysMswState();
  mockGetToken.mockClear();
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

describe("ApiKeysSettings", () => {
  it("lists masked keys and never shows full secrets from list", async () => {
    render(<ApiKeysSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("api-keys-list")).toBeInTheDocument();
    });

    expect(screen.getByTestId("api-key-masked-key_active")).toHaveTextContent(
      "fp_abcd12…",
    );
    expect(
      screen.queryByText(apiKeyFixtures.created.key),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("api-key-row-key_revoked")).toHaveTextContent(
      /revoked/i,
    );
  });

  it("creates a key and shows full secret once in modal", async () => {
    render(<ApiKeysSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("api-keys-list")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("api-keys-name-input"), {
      target: { value: "Staging" },
    });
    fireEvent.click(screen.getByTestId("api-keys-create-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("api-key-created-modal")).toBeInTheDocument();
    });

    expect(screen.getByTestId("api-key-created-secret")).toHaveTextContent(
      apiKeyFixtures.created.key,
    );

    fireEvent.click(screen.getByTestId("api-key-created-dismiss"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("api-key-created-modal"),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText(apiKeyFixtures.created.key),
    ).not.toBeInTheDocument();
  });

  it("revokes after confirm", async () => {
    render(<ApiKeysSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("api-key-revoke-key_active")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("api-key-revoke-key_active"));

    expect(screen.getByTestId("revoke-api-key-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("revoke-api-key-modal-confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("api-key-row-key_active")).toHaveTextContent(
        /revoked/i,
      );
    });
  });

  it("skips revoke when confirm is cancelled", async () => {
    render(<ApiKeysSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("api-key-revoke-key_active")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("api-key-revoke-key_active"));
    expect(screen.getByTestId("revoke-api-key-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("revoke-api-key-modal-cancel"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("revoke-api-key-modal"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("api-key-revoke-key_active")).toBeInTheDocument();
  });
});
