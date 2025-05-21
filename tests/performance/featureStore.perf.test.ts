import { performance } from 'perf_hooks'; // For Node.js environment used by Jest
import { createFeatureStore, FeatureDefinitions, FeatureStore } from '../../src'; // Adjust path as needed

describe('FeatureStore Performance', () => {
  it('createFeatureStore with 50 features should be performant', () => {
    const features: FeatureDefinitions = {};
    for (let i = 0; i < 50; i++) {
      features[`feature${i}`] = {
        initialState: { value: i, text: `Feature ${i}` },
        actions: (set) => ({
          updateValue: (newValue: number) => set({ value: newValue }),
        }),
      };
    }

    const startTime = performance.now();
    const store = createFeatureStore({ features });
    const endTime = performance.now();

    const duration = endTime - startTime;
    console.log(`Performance: createFeatureStore with 50 features took ${duration.toFixed(3)} ms`);

    // Example: Assert that store creation is reasonably fast (e.g., less than 50ms)
    // This threshold is arbitrary and should be adjusted based on expected performance.
    expect(duration).toBeLessThan(50);
    expect(store).toBeDefined();
  });

  it('State update for a single feature should be performant', () => {
    const specificFeatures = {
      testFeature: {
        initialState: { count: 0 },
        actions: (set: any) => ({
          increment: () => set((state: { count: number }) => ({ count: state.count + 1 })),
          setCount: (newCount: number) => set({ count: newCount }),
        }),
      },
    };

    const store: FeatureStore<typeof specificFeatures> = createFeatureStore({ features: specificFeatures });
    const actions = store.testFeature;

    const operations = 1000;
    const startTime = performance.now();
    for (let i = 0; i < operations; i++) {
      actions?.setCount(i);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    const averageTime = duration / operations;

    console.log(`Performance: ${operations} state updates took ${duration.toFixed(3)} ms (${averageTime.toFixed(3)} ms/op)`);
    // Example: Assert that updates are fast (e.g., less than 0.05ms per operation on average)
    expect(averageTime).toBeLessThan(0.05); 
  });
}); 
