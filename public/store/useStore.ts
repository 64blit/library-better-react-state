// @refresh reset

// ======= HOOK=======

import { useRouter, useSearchParams } from 'next/navigation'

import {
  createPopSlice,
  PopControllers,
  PopState,
  initialPopState,
} from './PopStore'
import {
  createReportSlice,
  ReportControllers,
  ReportState,
  initReportState,
} from './ReportStore'
import {
  createSSTSlice,
  SSTControllers,
  SSTState,
  initialSSTState,
} from './SSTStore'
import {
  createEyePopSlice,
  EyePopControllers,
  EyePopState,
  initialEyePopState,
} from './EyePopSdkStore'

// Import types and functions from the new store library
import {
  createAppStore,
  AppState,
  SliceConfig,
  BaseState,
  SliceControllers,
  StoreSlice,
  AppRootState, // Import StoreSlice
} from 'src/lib/store/AppStore' // Import from AppStore which re-exports from StoreUitls
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useLoading } from '@hooks/useLoading'
import { Session } from 'next-auth'

// =================================
// ======= APP STORE CONFIGURATION =======
// =================================

// Define the application's slice configurations
const appSlices: SliceConfig<any, any>[] = [
  {
    name: 'eyepop',
    create: (set, get, api) => createEyePopSlice(set, get, api),
    options: {
      // Define options here
      persist: { blacklist: ['initialized', 'connected'] },
    },
  },
  {
    name: 'pop',
    create: (set, get, api) => createPopSlice(set, get, api),
    options: {
      // Define options here
      persist: { whitelist: ['workers', 'metrics'] },
      dependencies: ['eyepop'],
    },
  },
  {
    name: 'sst',
    create: (set, get, api) => createSSTSlice(set, get, api),
    options: {
      // Define options here
      persist: {
        blacklist: ['progress'],
      },
      dependencies: ['eyepop'],
    },
  },
  {
    name: 'report',
    create: (set, get, api) => createReportSlice(set, get, api),
    options: {
      // Define options here
      persist: {
        blacklist: ['error', 'status', 'session', 'history'],
      },
      dependencies: ['eyepop'],
    },
  },
]

// Define the server-side save callback (placeholder)
const onSave = async (state: AppState) => {
  // console.log('Attempting to save state to server:', state)
  // TODO: Implement actual server-side saving logic here
  // This might involve filtering state, making an API call, etc.
}

// Create the application's store hook using the library function
export const useAppStore = createAppStore({
  name: 'eyepop-app-store',
  slices: appSlices,
  onSave: onSave, // Pass the callback here
})

// =================================
// ======= APP STORE HOOKS (Derived) =======
// =================================

// Type for the return value of useAppStoreWithAppData, combining AppState with additional hook properties
// Use a mapped type to represent the dynamic slices for better type safety
export type AppStoreHookReturn = AppRootState & {
  eyepop: StoreSlice<EyePopState, EyePopControllers>
  pop: StoreSlice<PopState, PopControllers>
  sst: StoreSlice<SSTState, SSTControllers>
  report: StoreSlice<ReportState, ReportControllers>
  router: ReturnType<typeof useRouter>
  searchParams: ReturnType<typeof useSearchParams>
  extraAppData: {
    sessionStatus: 'loading' | 'authenticated' | 'unauthenticated'
    isLoading: boolean
    isAuthenticated: boolean
    hasAccounts: boolean
    session: any
    user: Session
  }
}

// The main application hook that combines the store state with app-specific data
// This hook is used by other slice-specific hooks
export const useAppStoreWithAppData = (): AppStoreHookReturn => {
  const store = useAppStore() // Use the created app store hook
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if EyePopSDK is connected
  // Access slices via the dynamic property access
  const isSdkConnected =
    (store as any).eyepop?.controllers?.isConnected?.() || false
  const hasAccounts = session?.user?.updatedUser?.accounts?.length > 0

  useEffect(() => {
    if (!session || !session?.accessToken) return

    store.setup({
      ...session?.user?.updatedUser,
      accessToken: session?.accessToken,
    } as Session)
  }, [session, store])

  const isLoading = () => {
    if (!hasAccounts) return false
    if (!store.initialized) return true
    if (status === 'loading') return true
    // Check if all slices are initialized (optional, depends on desired loading state)
    const allSlicesInitialized = appSlices.every(
      (sliceConfig) => (store as any)[sliceConfig.name]?.initialized
    )
    if (!allSlicesInitialized) return true

    // Check SDK connection status if eyepop slice exists
    if ((store as any).eyepop && !isSdkConnected) return true

    return false
  }

  const isAuthenticated = () => {
    return status === 'authenticated' && !!session
  }

  // Return the combined state and additional properties
  return {
    ...(store as any), // Spread the store properties (AppRootState + dynamic slices)
    router,
    searchParams,
    extraAppData: {
      sessionStatus: status,
      session: session,
      user: session?.user?.updatedUser as Session,
      hasAccounts: hasAccounts,
      isLoading: isLoading(),
      isAuthenticated: isAuthenticated(),
    } as any,
  } as AppStoreHookReturn // Cast to the correct type
}

// ===============================
// ======= SST STORE HOOKS =======
// ===============================

type SSTHookType = ReturnType<typeof useAppStoreWithAppData> & {
  state: SSTState
  controllers: SSTControllers
  isReady: boolean
}
// Hook for working with the SST store
export const useSST = (): SSTHookType => {
  const store = useAppStoreWithAppData()

  const [isReady, setIsReady] = useState(false)

  const { showLoadingScreen, hideLoadingScreen } = useLoading(
    'sstLayout',
    false
  )

  useEffect(() => {
    // Check if the app is still loading or if EyePopSDK is not connected yet
    if (store.extraAppData.isLoading) {
      showLoadingScreen('Connecting to EyePop.ai ...')
      setIsReady(false)
    } else {
      hideLoadingScreen()
      setIsReady(true)
    }
  }, [store.extraAppData.isLoading])

  return {
    ...store,
    ...store.sst, // Spread slice properties
    state: store.sst.state,
    controllers: store.sst.controllers,
    isReady,
  }
}

// ===============================
// ======= Pop STORE HOOKS =======
// ===============================

type PopStoreHookType = ReturnType<typeof useAppStoreWithAppData> & {
  workerController: PopControllers['workerController']
}
// Hook for working with the AI worker feature
export const usePopStore = (): PopStoreHookType => {
  const store = useAppStoreWithAppData()

  return {
    ...store,
    ...store.pop, // Spread slice properties
    workerController: store.pop.controllers.workerController,
  }
}

// =================================
// ======= REPORT STORE HOOKS =======
// =================================

/**
 * Type definition for the report store hook return value.
 *
 * @property {ReportState} state - Contains all active UI state variables
 * @property {ReportWizardManager} manager - Orchestrates the report workflow and business logic
 * @property {NavigationController} navigationController - Manages wizard navigation and step progression
 * @property {EyePopSDK} eyepopSDK - Handles EyePop SDK integration and API interactions
 * @property {AssetCacheController} dataController - Manages asset caching and data persistence
 * @property {StateController} stateController - Controls state updates and synchronization
 * @property {Function} update - Triggers a full state refresh, causing all hooks to re-render
 * @property {Function} setState - Updates a portion of the state with partial state object
 * @property {Function} setError - Sets error state and updates error-related UI
 * @property {Function} reset - Resets the entire state to its initial values
 */
export type ReportHookType = ReturnType<typeof useAppStoreWithAppData> & {
  state: ReportState
  update: () => void
  controllers: ReportControllers
  setState: (state: Partial<ReportState>) => void
  setError: (error: any) => void
  reset: () => void
  showLoadingScreen: (optionalMessage?: string) => void
  hideLoadingScreen: () => void
  isReady: boolean
  setup: (session: Session | null) => Promise<void>
}

// Hook for working with the report feature
export const useReport = (): ReportHookType => {
  const store = useAppStoreWithAppData()
  const [isReady, setIsReady] = useState(false)

  const { showLoadingScreen, hideLoadingScreen } = useLoading(
    'reportLayout',
    false
  )

  // Handle the URL parameters
  useEffect(() => {
    const { searchParams, report, router } = store
    const { state } = report
    const { currentStep, history } = state

    // Handle create parameter
    if (searchParams.get('create')) {
      state.currentStep = 'create'
      state.history = ['viewAllReports']
      router.push(`?step=create`)
      return
    }

    if (currentStep === 'viewAllReports') {
      store.report.reset()
    }

    // Handle step parameter
    if (!searchParams.get('step')) {
      state.currentStep = 'viewAllReports'
      state.history = [currentStep]
    }

    // Update URL if step changed
    let urlParams = `?step=${currentStep}`
    if (state.reportId) {
      urlParams = `?step=${currentStep}&datasetUUID=${state.reportId}`
    }

    router.push(urlParams)
  }, [store.report.state.currentStep])

  // Handle the loading screen
  useEffect(() => {
    if (store.extraAppData.isLoading || store.isInitializing) {
      showLoadingScreen('Connecting to EyePop.ai ...')
      setIsReady(false)
    } else {
      hideLoadingScreen()
      setIsReady(true)
    }
  }, [store.extraAppData.isLoading, store.isInitializing])

  return {
    ...store,
    ...store.report, // Spread slice properties
    isReady,
    controllers: store.report.controllers,
    state: store.report.state,
    update: store.report.update,
    setState: store.report.setState,
    setError: store.report.setError,
    reset: store.report.reset,
    showLoadingScreen,
    hideLoadingScreen,
  }
}
