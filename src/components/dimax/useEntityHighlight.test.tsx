import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { entityKey, useEntityHighlight } from "./useEntityHighlight";

function Page() {
  useEntityHighlight();
  const a1 = entityKey("installer", "a1");
  return (
    <div>
      <span data-entity={a1} data-testid="tile">Installer A-1</span>
      <table>
        <tbody>
          <tr data-entity={a1} data-testid="row-1"><td>Project 1</td></tr>
          <tr data-entity={entityKey("installer", "a2")} data-testid="row-2"><td>Project 2</td></tr>
        </tbody>
      </table>
      <button data-entity={a1} data-testid="focusable">Open</button>
      <p data-testid="outside">nothing</p>
    </div>
  );
}

describe("linked highlighting (E2)", () => {
  it("marks every occurrence of the hovered entity and clears on leave", () => {
    const { getByTestId } = render(<Page />);
    fireEvent.mouseOver(getByTestId("tile"));
    expect(getByTestId("tile")).toHaveClass("is-linked");
    expect(getByTestId("row-1")).toHaveClass("is-linked");
    expect(getByTestId("row-2")).not.toHaveClass("is-linked");
    fireEvent.mouseOut(getByTestId("tile"), { relatedTarget: getByTestId("outside") });
    expect(getByTestId("row-1")).not.toHaveClass("is-linked");
  });

  it("follows keyboard focus too", () => {
    const { getByTestId } = render(<Page />);
    fireEvent.focusIn(getByTestId("focusable"));
    expect(getByTestId("tile")).toHaveClass("is-linked");
    fireEvent.focusOut(getByTestId("focusable"), { relatedTarget: getByTestId("outside") });
    expect(getByTestId("tile")).not.toHaveClass("is-linked");
  });

  it("removes its marks on unmount", () => {
    const { getByTestId, unmount } = render(<Page />);
    fireEvent.mouseOver(getByTestId("row-1"));
    expect(getByTestId("tile")).toHaveClass("is-linked");
    unmount();
    expect(document.querySelectorAll(".is-linked")).toHaveLength(0);
  });
});
