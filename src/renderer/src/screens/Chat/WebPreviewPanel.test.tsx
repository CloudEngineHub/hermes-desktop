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
    const onInspectElement = vi.fn();
    const { container, getByTitle } = render(
      <WebPreviewPanel
        initialUrl="http://localhost:3000/"
        onClose={vi.fn()}
        onInspectElement={onInspectElement}
      />,
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

    const injectedScript = webview.executeJavaScript.mock.calls.find(
      ([script]) =>
        typeof script === "string" &&
        script.includes("__hermes_inspector_overlay"),
    )?.[0] as string;
    expect(injectedScript).toContain("getUniqueSelector");
    expect(injectedScript).not.toContain("outerHTML");
    expect(() => new Function(injectedScript)).not.toThrow();

    const selectedElement = document.createElement("h1");
    selectedElement.id = "hero-heading";
    document.body.appendChild(selectedElement);
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => selectedElement),
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    new Function(injectedScript)();
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 10, clientY: 10 }),
    );
    document.dispatchEvent(
      new MouseEvent("click", { clientX: 10, clientY: 10 }),
    );

    const resultMessage = consoleSpy.mock.calls
      .map(([message]) => message)
      .find(
        (message) =>
          typeof message === "string" &&
          message.startsWith("__HERMES_INSPECT_RESULT__:"),
      );
    expect(resultMessage).toBe(
      '__HERMES_INSPECT_RESULT__:{"selector":"#hero-heading"}',
    );

    consoleSpy.mockRestore();
    selectedElement.remove();
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: originalElementFromPoint,
    });

    const resultEvent = new Event("console-message") as Event & {
      message: string;
      sourceId: string;
      line: number;
    };
    resultEvent.message = resultMessage as string;
    resultEvent.sourceId = "";
    resultEvent.line = 1;
    act(() => {
      webview.dispatchEvent(resultEvent);
    });

    expect(onInspectElement).toHaveBeenCalledWith({
      selector: "#hero-heading",
    });
  });
});
