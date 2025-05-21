import * as lib from "../src/index"; // Adjust path if your output is elsewhere or tsconfig paths are used

describe("Library Smoke Test", () => {
  it("should be importable and not throw an error on basic invocation", () => {
    expect(() => {
      // Depending on what your library exports, you might do something like:
      // const store = lib.createStore(); // if you have a createStore function
      // For now, just check if the import worked and maybe a placeholder function exists
      if (typeof lib === "object" && lib !== null) {
        // Check if the placeholder console.log exists or some exported member
        // This is a very basic check
        expect(lib).toBeDefined();
      } else {
        throw new Error("Library could not be imported as an object.");
      }
    }).not.toThrow();
  });
});
