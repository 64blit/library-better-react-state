// @refresh reset
import {
  BaseState,
  createStoreSlice,
  ReportSession,
  CreateSliceOptions, // Import CreateSliceOptions
} from 'src/lib/store/StoreUitls'
import { EyePopSDK } from '@controllers/sdk/EyePopSDK'
import { ApiStatus } from '@controllers/sdk/types'

// ======= EYEPOP SDK SLICE =======

// Define the state for the EyePop SDK slice
export interface EyePopState extends BaseState {
  initialized: boolean
  connected: boolean
  error: string | null
  status: Record<string, ApiStatus>
}

// Define the type for EyePop SDK controllers
export type EyePopControllers = {
  sdk: EyePopSDK | null
  isConnected: () => boolean
  isInitialized: () => boolean
  getError: () => string | null
  getSDK: () => EyePopSDK | null
}

// Initial EyePop SDK state
export const initialEyePopState: EyePopState = {
  // Export initial state
  initialized: false,
  connected: false,
  status: {
    sdk: 'uninitialized',
  },
  error: null,
  version: 0,
}

// Create the EyePop SDK slice creator function
export const createEyePopSlice = createStoreSlice<
  EyePopState,
  EyePopControllers
>(
  initialEyePopState,
  'eyepop',
  async (update, get, getSliceState, setSliceState, session) => {
    // Use getSliceState and setSliceState
    // API Status Methods
    const updateEyePopStatus = (status: ApiStatus): void => {
      console.info(`🔥 EyePop SDK: ${status}`)
      switch (status) {
        case 'connected':
          setSliceState({
            // Use setSliceState
            status: {
              sdk: 'connected',
            },
            initialized: true,
            connected: true,
          })
          break
        case 'error':
        case 'disconnected':
          setSliceState({
            // Use setSliceState
            status: {
              sdk: 'disconnected',
            },
            connected: false,
            initialized: false,
          })
          break
        default:
          setSliceState({
            // Use setSliceState
            status: {
              sdk: status,
            },
          })
      }
    }

    // Initialize the EyePop SDK
    const sdk = new EyePopSDK(updateEyePopStatus)

    // Set up the SDK with session data if available
    if (session?.accessToken) {
      const accountId = session.accounts?.at(0)
      if (accountId) {
        sdk.setAccountId(accountId)
        sdk.setSession(session.accessToken, session.expires)

        try {
          await sdk.connect() // Waits for the SDK to connect

          setSliceState({
            // Use setSliceState
            initialized: true,
            status: {
              sdk: 'connected',
            },
          })
        } catch (error) {
          setSliceState({
            // Use setSliceState
            initialized: true,
            connected: false,
            status: {
              sdk: 'error',
            },
            error:
              error instanceof Error
                ? error.message
                : 'Failed to connect to EyePop SDK',
          })
        }
      }
    }

    // Helper methods for other slices to use
    const isConnected = () => getSliceState().connected // Use getSliceState
    const isInitialized = () => getSliceState().initialized // Use getSliceState
    const getError = () => getSliceState().error // Use getSliceState
    const getSDK = () => sdk

    return {
      sdk,
      isConnected,
      isInitialized,
      getError,
      getSDK,
    }
  }
)
