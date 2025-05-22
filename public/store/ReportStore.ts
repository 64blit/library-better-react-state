// @refresh reset
import { EyePopSDK } from '../controllers/sdk/EyePopSDK'
import { AssetCacheController } from '../controllers/sdk/AssetCacheController'
import { ReportStateController } from '../controllers/report/state/ReportStateController'
import { NavigationController } from '../controllers/report/navigation/NavigationController'

import {
  BaseState,
  createStoreSlice,
  ReportSession,
} from 'src/lib/store/StoreUitls'

import { ReportFields } from '../controllers/report/state/types'
import { ApiStatus } from '../controllers/sdk/types'
import { AssetManagerState } from '../controllers/sdk/types'
import { ReportWizardStep } from '../controllers/report/navigation/types'
import type { AppState } from 'src/lib/store/AppStore' // Updated import path
import { ReportManager } from '@controllers/report/ReportManager'
import { ReportDatasetCard } from '@controllers/sdk/eyepop/EyePopReports'

// Add global declaration for store
declare global {
  interface Window {
    store: any
  }
}

// ======= REPORT SLICE =======
// Define types for the report controllers for better IDE navigation
export type ReportControllers = {
  manager: ReportManager
  navigationController: NavigationController
  dataController: AssetCacheController // Replace with specific type when available
  stateController: ReportStateController<ReportState>
}

export interface ReportState extends BaseState {
  fields: ReportFields
  assets: AssetManagerState
  currentStep: ReportWizardStep
  datasets: ReportDatasetCard[] | null
  reportId: string | null
  workflowId: string | null
  error: string | null
  initialized: boolean

  status: {
    [key: string]: ApiStatus
  }
  session: ReportSession | null

  controllers: {
    manager: ReportManager | null
    navigationController: NavigationController | null
    dataController: AssetCacheController | null
    stateController: ReportStateController<ReportState> | null
  }
  history: ReportWizardStep[]
}

export const initReportState: ReportState = {
  fields: {
    name: '',
    description: '',
    source: 'images',
    label: null,
    properties: [],
    customPrompt: '',
    estimatedTime: '',
    price: 100,
    location: 'My computer',
  },
  assets: {
    assets: [],
    upload: {
      uploadProgress: 0,
      uploadTotalFiles: 0,
      uploadCurrentFileIndex: 0,
    },
    processing: {
      processingProgress: 0,
      processingStatusMessage: null,
      processingEstimatedTimeLeft: null,
      totalImages: 0,
      foundObjects: 0,
      timeToRun: '',
    },
    dataset: {
      label: '',
      properties: [],
      version: 1,
      uuid: null,
    },
    review: {
      currentPage: 1,
      confidenceThreshold: 0.22,
      imagesPerPage: 100,
    },
  },
  datasets: null,
  currentStep: 'viewAllReports',
  version: 0,
  reportId: null,
  workflowId: null,
  error: null,
  initialized: false,
  status: {
    eyepop: 'uninitialized',
  },
  session: null,
  controllers: {
    manager: null,
    navigationController: null,
    dataController: null,
    stateController: null,
  },
  history: ['create'],
}

// Create the report slice with its controllers
export const createReportSlice = createStoreSlice<
  ReportState,
  ReportControllers
>(
  initReportState,
  'report',
  async (update, get, getState, setState, session) => {
    if (!session || !session.accessToken) return

    // The sdk should already be initialized in the EyePopSDK slice
    const eyepopSDK = get().eyepop?.controllers?.getSDK()

    if (!eyepopSDK) {
      throw new Error('EyePopSDK is not initialized, cannot set up ReportStore')
    }

    // Set up the account data if available
    const accountId = session.accounts?.at(0)
    if (!accountId) return

    const state = getState()

    // Create manager and controllers for the report slice
    const manager = new ReportManager(update, getState, setState, eyepopSDK)
    const navigationController = manager.getNavigationController()
    const dataController = manager.getDataController()
    const stateController = manager.getStateController()
    const datasetUUID = state.assets.dataset.uuid
    const datasetVersion = state.assets.dataset.version
    if (datasetUUID && datasetVersion) {
      eyepopSDK.setActiveDataset(datasetUUID, datasetVersion)
    }

    setState({
      initialized: true,
    })

    return {
      manager,
      navigationController,
      dataController,
      stateController,
    }
  }
)
