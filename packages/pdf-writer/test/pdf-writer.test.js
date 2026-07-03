import { describe, it, expect } from "vitest";
import { rgb } from "pdf-lib";
import { hexToRgb } from "../src/index.js";

describe("hexToRgb", () => {
  it("maps a hex string to normalized pdf-lib rgb", () => {
    expect(hexToRgb("#ff0000")).toEqual(rgb(1, 0, 0));
  });

  it("maps black", () => {
    expect(hexToRgb("#000000")).toEqual(rgb(0, 0, 0));
  });
});
