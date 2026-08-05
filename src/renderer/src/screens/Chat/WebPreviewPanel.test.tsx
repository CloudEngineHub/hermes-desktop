import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

vi.mock("lucide-react", () => ({
  X: () => null,
  ArrowLeft: () => null,
  ArrowRight: () => null,
  RotateCw: () => null,
  ExternalLink: () => null,
  Globe: () => null,
  MousePointerClick: () => null,
}));

import { WebPreviewPanel } from "./WebPreviewPanel";

afterEach(cleanup);

describe("WebPreviewPanel inspector lifecycle", () => {
  it("keeps inspector injection available after same-document navigation", async () => {
    const { container, getByTitle } = render(
      <WebPreviewPanel initialUrl="http://localhost:3000/" onClose={vi.fn()} />,
    );
    const webview = container.querySelector("webview") as HTMLElement & {
      canGoBack: () => boolean;
      canGoForward: () => boolean;
      executeJavaScript: ReturnType<typeof vi.fn>;
    };
    webview.canGoBack = () => false;
    webview.canGoForward = () => false;
    webview.executeJavaScript = vi.fn().mockResolvedValue(undefined);

    act(() => {
      webview.dispatchEvent(new Event("dom-ready"));
    });

    const navigation = new Event("did-navigate-in-page") as Event & {
      url: string;
    };
    navigation.url = "http://localhost:3000/#hydrated";
    act(() => {
      webview.dispatchEvent(navigation);
    });

    fireEvent.click(getByTitle("Inspect Element"));

    await waitFor(() => {
      expect(webview.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining("__hermes_inspector_overlay"),
      );
    });
  });
});
