/**
 * Tests for storage adapters
 */

import { LocalStorageAdapter } from "../../src/persistence/LocalStorageAdapter";
import { MemoryCacheAdapter } from "../../src/persistence/MemoryCacheAdapter";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Assign mock localStorage to global object
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("LocalStorageAdapter", () => {
  const testKey = "test-feature";
  const testPrefix = "test-prefix";
  const testValue = { name: "Test", value: 42 };
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorageMock.clear();
    adapter = new LocalStorageAdapter(testKey, testPrefix);
  });

  it("should save data to localStorage", async () => {
    const result = await adapter.save(testValue);

    expect(result).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      `${testPrefix}:${testKey}`,
      JSON.stringify(testValue),
    );
  });

  it("should load data from localStorage", async () => {
    await adapter.save(testValue);
    localStorageMock.getItem.mockClear(); // Clear previous calls

    const result = await adapter.load();

    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      `${testPrefix}:${testKey}`,
    );
    expect(result).toEqual(testValue);
  });

  it("should return null when loading non-existent data", async () => {
    const result = await adapter.load();

    expect(result).toBeNull();
  });

  it("should clear data from localStorage", async () => {
    await adapter.save(testValue);
    localStorageMock.removeItem.mockClear(); // Clear previous calls

    const result = await adapter.clear();

    expect(result).toBe(true);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      `${testPrefix}:${testKey}`,
    );
  });

  it("should handle localStorage not being available", async () => {
    // Mock isLocalStorageAvailable to return false
    const spy = jest
      .spyOn(adapter as any, "isLocalStorageAvailable")
      .mockReturnValue(false);

    const saveResult = await adapter.save(testValue);
    const loadResult = await adapter.load();
    const clearResult = await adapter.clear();

    expect(saveResult).toBe(false);
    expect(loadResult).toBeNull();
    expect(clearResult).toBe(false);

    spy.mockRestore();
  });
});

describe("MemoryCacheAdapter", () => {
  const testKey = "test-feature";
  const testPrefix = "test-prefix";
  const testValue = { name: "Test", value: 42 };
  let adapter: MemoryCacheAdapter;

  beforeEach(() => {
    MemoryCacheAdapter.clearAll();
    adapter = new MemoryCacheAdapter(testKey, testPrefix);
  });

  it("should save data to memory cache", async () => {
    const result = await adapter.save(testValue);

    expect(result).toBe(true);
  });

  it("should load data from memory cache", async () => {
    await adapter.save(testValue);

    const result = await adapter.load();

    expect(result).toEqual(testValue);
  });

  it("should return null when loading non-existent data", async () => {
    const result = await adapter.load();

    expect(result).toBeNull();
  });

  it("should clear data from memory cache", async () => {
    await adapter.save(testValue);

    const result = await adapter.clear();

    expect(result).toBe(true);
    expect(await adapter.load()).toBeNull();
  });

  it("should check if key exists in cache", async () => {
    expect(await adapter.has()).toBe(false);

    await adapter.save(testValue);

    expect(await adapter.has()).toBe(true);
  });

  it("should respect TTL for cached items", async () => {
    const ttl = 100; // 100ms TTL
    const adapterWithTtl = new MemoryCacheAdapter(testKey, testPrefix, ttl);

    await adapterWithTtl.save(testValue);

    // Should still be valid
    expect(await adapterWithTtl.has()).toBe(true);
    expect(await adapterWithTtl.load()).toEqual(testValue);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, ttl + 50));

    // Should be expired now
    expect(await adapterWithTtl.has()).toBe(false);
    expect(await adapterWithTtl.load()).toBeNull();
  });

  it("should clear all entries from the cache", async () => {
    const adapter2 = new MemoryCacheAdapter("another-feature", testPrefix);

    await adapter.save(testValue);
    await adapter2.save(testValue);

    expect(await adapter.load()).toEqual(testValue);
    expect(await adapter2.load()).toEqual(testValue);

    MemoryCacheAdapter.clearAll();

    expect(await adapter.load()).toBeNull();
    expect(await adapter2.load()).toBeNull();
  });
});
