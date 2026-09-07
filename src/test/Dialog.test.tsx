import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

describe("Dialog", () => {
  it("keeps long forms inside the viewport with an internal scroll area", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>Project form</DialogDescription>
          <div style={{ height: 1600 }}>Long form content</div>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-h-[calc(100vh-2rem)]", "overflow-y-auto");
  });

  it("renders dialog content above its blocking overlay", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>Project form</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("z-[60]");
  });
});
