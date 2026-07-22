// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  countRunningTasksByAssignee,
  officeAgentsChanged,
  profilesToOfficeAgents,
  type OfficeProfileInput,
  type OfficeTaskInput,
} from "./agents";

const profiles: OfficeProfileInput[] = [
  { id: "default", name: "default", gatewayRunning: true },
  {
    id: "code-monkey-dashboard",
    name: "code-monkey-dashboard",
    gatewayRunning: false,
  },
  { id: "dashcraft", name: "dashcraft", gatewayRunning: true },
];

describe("Office Kanban activity", () => {
  it("marks only assignees of running cards as working", () => {
    const tasks: OfficeTaskInput[] = [
      { assignee: "code-monkey-dashboard", status: "running" },
      { assignee: " @CODE-MONKEY-DASHBOARD ", status: "running" },
      { assignee: "dashcraft", status: "done" },
      { assignee: null, status: "running" },
    ];

    const agents = profilesToOfficeAgents(profiles, tasks);

    expect(
      agents.map(({ id, status, activeTaskCount }) => ({
        id,
        status,
        activeTaskCount,
      })),
    ).toEqual([
      { id: "default", status: "idle", activeTaskCount: 0 },
      {
        id: "code-monkey-dashboard",
        status: "working",
        activeTaskCount: 2,
      },
      { id: "dashcraft", status: "idle", activeTaskCount: 0 },
    ]);
  });

  it("falls back to gateway liveness when Kanban is unavailable", () => {
    const agents = profilesToOfficeAgents(profiles, null);

    expect(
      agents.map(({ id, status, activeTaskCount }) => ({
        id,
        status,
        activeTaskCount,
      })),
    ).toEqual([
      { id: "default", status: "working", activeTaskCount: undefined },
      {
        id: "code-monkey-dashboard",
        status: "idle",
        activeTaskCount: undefined,
      },
      { id: "dashcraft", status: "working", activeTaskCount: undefined },
    ]);
  });

  it("counts only running cards with non-empty assignees", () => {
    const counts = countRunningTasksByAssignee([
      { assignee: "default", status: "running" },
      { assignee: "DEFAULT", status: "running" },
      { assignee: "default", status: "blocked" },
      { assignee: " ", status: "running" },
    ]);

    expect(Object.fromEntries(counts)).toEqual({ default: 2 });
  });

  it("detects activity-count changes even when status stays working", () => {
    const before = profilesToOfficeAgents(profiles, [
      { assignee: "default", status: "running" },
    ]);
    const after = profilesToOfficeAgents(profiles, [
      { assignee: "default", status: "running" },
      { assignee: "default", status: "running" },
    ]);

    expect(officeAgentsChanged(before, after)).toBe(true);
    expect(officeAgentsChanged(after, after)).toBe(false);
  });
});
