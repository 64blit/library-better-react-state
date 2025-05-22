// @refresh reset
import {
  Asset,
  Dataset,
  Model,
  Annotation,
  AnnotationType,
  UserReview,
  PredictedClass,
  Prediction,
  DatasetVersionAssetStats,
  ModelUpdate,
  DatasetUpdate,
} from '@eyepop.ai/eyepop'
import {
  BaseState,
  createStoreSlice,
  CreateSliceOptions,
} from 'src/lib/store/StoreUitls' // Import CreateSliceOptions
import { SSTManager } from '@controllers/sst/SSTManager'
import {
  ReportWizardStep,
  SSTWizardStep,
  SSTWizardSteps,
} from '@controllers/report/navigation/types'
import { AssetManagerState } from '@controllers/sdk/types'
import { AssetCacheController } from '@controllers/sdk/AssetCacheController'
import { ReportStateController } from '@controllers/report/state/ReportStateController'

// ======= SST SLICE =======

// Define the type for training controllers
export type SSTControllers = {
  sstManager: SSTManager
}

// Review status enum (migrated from HumanReviewContext)
export enum ReviewStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EDITING = 'editing',
  PREVIEWING = 'previewing',
}

// Wizard types enum (migrated from HumanReviewContext)
export enum WizardTypes {
  OBJECT = 'object',
  SEGMENTATION = 'segmentation',
  CLASSIFICATION = 'classification',
  KEYPOINT = 'keypoint',
}

// Review mode enum (migrated from HumanReviewContext)
export enum ReviewMode {
  SINGLE = 'single',
  GRID = 'grid',
}

// Toolbar status enum (migrated from ReviewToolbarContext)
export enum ReviewToolbarStatus {
  PREVIEWING = 'previewing',
  READY = 'ready',
  SAVING = 'saving',
  PANNING = 'panning',
  ANNOTATING = 'annotating',
  LABELING = 'labeling',
  CLEARLABELS = 'clearlabels',
  RESETTING = 'resetting',
  CANCELING = 'canceling',
  POINTMODE = 'pointmode',
}

// Label data interface (migrated from ReviewToolbarContext)
export interface LabelDataItem {
  type: string
  count: number
  label: string
  classLabel: string
  active: boolean
  uuid: string
  color?: string
}

// Grid item interface (migrated from ClassificationContext)
export interface GridItem {
  uuid: string
  selected?: boolean
  approved?: boolean | null
}

// SST state including all migrated state from context providers
export interface SSTState extends BaseState {
  // Original SSTState
  courses: any[]
  progress: Record<string, number>
  initialized: boolean
  history: ReportWizardStep[]

  assets: AssetManagerState
  sstId: string
  dataset: Dataset
  fields: {
    name: string
    description: string
    label: string
    properties: string
  }

  // Migrated from NodeSdkDataProvider
  endpoint: any | null
  isConnecting: boolean
  dataStatus: string
  wizardType: string
  images: string[]
  activeModels: any[] | null
  activeDatasets: any[] | null
  datasetVersion: number
  accountUUID: string
  datasetUUID: string
  modelUUID: string
  modelName: string | null
  model: Model | undefined
  confidenceThreshold: number
  autoLabelingProgress: number
  analysisProgress: number
  datasetStats?: any
  assetMap: Record<string, any>
  imageFilter: { [key: string]: boolean }
  rejectCount: number
  lastAnnotatedAsset: Asset | null
  popId?: string

  // Annotations data for SST workflow
  annotations?: {
    [imageId: string]: {
      status?: 'approved' | 'rejected' | 'tbd'
      groundTruth?: any
      [key: string]: any
    }
  }

  // Migrated from HumanReviewContext
  reviewStatus: ReviewStatus
  currentImageIndex: number
  thumbnails: any[]
  startIndex: number
  mainImage: any
  autoLabelRunning: boolean
  postTraining: boolean
  skipToUnapprovedIndex: boolean
  autoSave: boolean
  gridSize: number
  mode: ReviewMode
  currentStep: SSTWizardStep

  // Migrated from ReviewToolbarContext
  toolbarStatus: ReviewToolbarStatus
  labelData: Record<string, LabelDataItem>
  activeLabelData: Record<string, LabelDataItem>
  allClassLabels: string[]
  activeLabel: string

  // Migrated from ClassificationContext
  checkedElements: GridItem[]
}

// Initial SST state with all fields
export const initialSSTState: SSTState = {
  // Export initial state
  // Original SSTState
  courses: [],
  progress: {},
  history: [],
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
  status: { initialized: 'false' },
  error: null,
  initialized: false,
  version: 0,
  sstId: '',
  dataset: null as any,
  fields: {
    name: '',
    description: '',
    label: '',
    properties: '',
  },

  // Migrated from NodeSdkDataProvider
  endpoint: null,
  isConnecting: false,
  dataStatus: 'IDLE',
  wizardType: 'object',
  images: [],
  activeModels: null,
  activeDatasets: null,
  datasetVersion: 0,
  accountUUID: '',
  datasetUUID: '',
  modelUUID: '',
  modelName: null,
  model: undefined,
  confidenceThreshold: 0.5,
  autoLabelingProgress: 0,
  analysisProgress: 0,
  datasetStats: undefined,
  assetMap: {},
  imageFilter: { approved: true, rejected: true, tbd: true },
  rejectCount: 0,
  lastAnnotatedAsset: null,
  popId: undefined,

  // Annotations data for SST workflow
  annotations: undefined,

  // Migrated from HumanReviewContext
  reviewStatus: ReviewStatus.PREVIEWING,
  currentImageIndex: 0,
  thumbnails: [],
  startIndex: 0,
  mainImage: null,
  autoLabelRunning: false,
  postTraining: false,
  skipToUnapprovedIndex: false,
  autoSave: true,
  gridSize: 15,
  mode: ReviewMode.SINGLE,
  currentStep: SSTWizardSteps.ModelList,

  // Migrated from ReviewToolbarContext
  toolbarStatus: ReviewToolbarStatus.ANNOTATING,
  labelData: {},
  activeLabelData: {},
  allClassLabels: [],
  activeLabel: '',

  // Migrated from ClassificationContext
  checkedElements: [],
}

// Create the training slice creator function
export const createSSTSlice = createStoreSlice<SSTState, SSTControllers>(
  initialSSTState,
  'sst',
  async (update, get, getSliceState, setSliceState, session) => {
    // Use getSliceState and setSliceState
    const sdk = get()?.eyepop?.controllers?.getSDK()
    return // TODO: remove this

    if (!sdk) {
      throw new Error('EyePopSDK not found')
    }

    // Create SSTManager
    const sstManager = new SSTManager(update, getSliceState, setSliceState, sdk) // Use getSliceState and setSliceState
    const stateController = new ReportStateController<SSTState>(
      getSliceState, // Use getSliceState
      setSliceState, // Use setSliceState
      update
    )
    const assetManager = new AssetCacheController()
    await sstManager.initialize(getSliceState, setSliceState) // Use getSliceState and setSliceState

    setSliceState({
      // Use setSliceState
      initialized: true,
    })

    return {
      sstManager,
      stateController,
      assetManager,
    }
  }
)
