import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProblemProjectsTable } from "@/components/dashboard/ProblemProjectsTable";
import { LanguageProvider } from "@/lib/i18n";

const storageState = new Map<string, string>();

const storageMock = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageState.set(key, value);
  },
  removeItem: (key: string) => {
    storageState.delete(key);
  },
};

describe("ProblemProjectsTable", () => {
  beforeEach(() => {
    storageState.clear();
    document.documentElement.lang = "en";
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
  });

  it("shows project address and opens the selected problem project", () => {
    const onOpenProject = vi.fn();

    render(
      <LanguageProvider>
        <ProblemProjectsTable
          projects={[
            {
              projectId: "project-1",
              name: "Ashdod Towers",
              problems: 7,
              address: "Ashdod, Tower A",
            },
          ]}
          onOpenProject={onOpenProject}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText("Ashdod Towers")).toBeInTheDocument();
    expect(screen.getByText("Ashdod, Tower A")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open project/i }));

    expect(onOpenProject).toHaveBeenCalledWith("project-1");
  });
});
