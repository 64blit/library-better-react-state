// @refresh reset
import {
  BaseState,
  createStoreSlice,
  CreateSliceOptions, // Import CreateSliceOptions
} from 'src/lib/store/StoreUitls'
import { AppState } from 'src/lib/store/AppStore' // Import AppState for get type

// ======= POP SLICE =======

// Simple AI worker state
export interface PopState extends BaseState {
  workers: any[]
  metrics: Record<string, any>
  initialized: boolean
}

// Define the type for AI worker controllers
export type PopControllers = {
  workerController: {
    loadWorkers: () => Promise<void>
  }
}

// Initial AI worker state
export const initialPopState: PopState = {
  // Export initial state
  workers: [],
  metrics: {},
  status: { initialized: 'false' },
  error: null,
  initialized: false,
  version: 0,
}

// Create the AI worker slice creator function
export const createPopSlice = createStoreSlice<PopState, PopControllers>(
  initialPopState,
  'pop',
  async (update, get, getSliceState, setSliceState, session) => {
    // Use getSliceState and setSliceState
    // Mock AI worker controller
    const workerController = {
      loadWorkers: async () => {
        // Mock data
        setSliceState({
          // Use setSliceState
          workers: [
            { id: 'worker1', status: 'active', load: 0.7 },
            { id: 'worker2', status: 'idle', load: 0.2 },
          ],
        })
        return Promise.resolve()
      },
    }

    setSliceState({
      // Use setSliceState
      initialized: true,
    })

    return {
      workerController,
    }
  }
)
