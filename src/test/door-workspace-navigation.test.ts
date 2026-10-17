import { describe, expect, it } from "vitest";

import { defaultMatrixDensity, isMatrixArrowKey, matrixDoorState, nextMatrixTile } from "@/components/projects/door-workspace/matrix-shared";

const tiles = [
  { id: "2-a", floorKey: "1-2" }, { id: "2-b", floorKey: "1-2" }, { id: "2-c", floorKey: "1-2" },
  { id: "1-a", floorKey: "1-1" }, { id: "1-b", floorKey: "1-1" },
];
const byId = (id: string) => tiles.find((tile) => tile.id === id)!;

describe("door matrix keyboard navigation (E7)", () => {
  it("moves along the floor and stops at its ends", () => {
    expect(nextMatrixTile(tiles, byId("2-a"), "ArrowRight")?.id).toBe("2-b");
    expect(nextMatrixTile(tiles, byId("2-c"), "ArrowRight")).toBeNull();
    expect(nextMatrixTile(tiles, byId("2-b"), "ArrowLeft")?.id).toBe("2-a");
    expect(nextMatrixTile(tiles, byId("2-a"), "ArrowLeft")).toBeNull();
  });

  it("mirrors left and right in RTL", () => {
    expect(nextMatrixTile(tiles, byId("2-a"), "ArrowLeft", true)?.id).toBe("2-b");
    expect(nextMatrixTile(tiles, byId("2-b"), "ArrowRight", true)?.id).toBe("2-a");
  });

  it("keeps the position across floors and clamps to the shorter floor", () => {
    expect(nextMatrixTile(tiles, byId("2-c"), "ArrowDown")?.id).toBe("1-b");
    expect(nextMatrixTile(tiles, byId("1-b"), "ArrowUp")?.id).toBe("2-b");
    expect(nextMatrixTile(tiles, byId("1-a"), "ArrowDown")).toBeNull();
  });

  it("recognises only the four arrow keys", () => {
    expect(isMatrixArrowKey("ArrowUp")).toBe(true);
    expect(isMatrixArrowKey("Enter")).toBe(false);
  });
});

describe("compact matrix rows", () => {
  it("derives one state word per door, issues first", () => {
    expect(matrixDoorState({ status: "INSTALLED", issue_count: 0 })).toBe("installed");
    expect(matrixDoorState({ status: "INSTALLED", issue_count: 2 })).toBe("problem");
    expect(matrixDoorState({ status: "IN_PROGRESS", issue_count: 0 })).toBe("progress");
    expect(matrixDoorState({ status: "LOCKED", issue_count: 0 })).toBe("blocked");
    expect(matrixDoorState({ status: "CANCELLED", issue_count: 0 })).toBe("cancelled");
    expect(matrixDoorState({ status: "NOT_INSTALLED", issue_count: 0 })).toBe("open");
  });


  it("defaults to rows from 25 doors unless a choice is stored", () => {
    expect(defaultMatrixDensity(9, null)).toBe("cards");
    expect(defaultMatrixDensity(580, null)).toBe("rows");
    expect(defaultMatrixDensity(580, "cards")).toBe("cards");
    expect(defaultMatrixDensity(9, "rows")).toBe("rows");
    expect(defaultMatrixDensity(9, "cells")).toBe("cards");
  });
});
