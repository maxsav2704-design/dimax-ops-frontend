import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmActionDialog } from "./ConfirmActionDialog";

vi.mock("@/lib/i18n", () => ({
  useCopy: () => (en: string) => en,
  useI18n: () => ({ locale: "en" }),
}));

describe("confirm action dialog (E10)", () => {
  it("repeats the verb, states what does not change and gates on the review box", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmActionDialog
        open
        onOpenChange={() => {}}
        title="Activate price list for all projects"
        changes="New work uses version 6 from now on."
        keeps="Recorded earnings are not recalculated."
        reviewLabel="I reviewed the rate differences."
        confirmLabel="Activate price list for all projects"
        onConfirm={onConfirm}
        testId="confirm"
      />,
    );
    expect(screen.getByRole("heading", { name: "Activate price list for all projects" })).toBeInTheDocument();
    expect(screen.getByText("Recorded earnings are not recalculated.")).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Activate price list for all projects" });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirms directly when no review is required and cancels through the same handler", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmActionDialog open onOpenChange={onOpenChange} title="Delete reason" changes="The reason disappears from new forms." confirmLabel="Delete reason" onConfirm={onConfirm} tone="danger" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete reason" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
