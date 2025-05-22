import { Asset } from '@eyepop.ai/eyepop'

export interface ReportAsset extends Asset {
  imageUrl?: string
}

export interface UploadProgress {
  uploadProgress: number
  uploadTotalFiles: number
  uploadCurrentFileIndex: number
}

export interface ProcessingProgress {
  processingProgress: number
  processingStatusMessage: string | null
  processingEstimatedTimeLeft: string | null
  totalImages: number
  foundObjects: number
  timeToRun: string
}

export interface DatasetConfig {
  label: string
  properties: string[]
  version: number
  uuid: string | null
}

export interface ReviewConfig {
  currentPage: number
  confidenceThreshold: number
  imagesPerPage: number
}

export interface AssetManagerState {
  assets: ReportAsset[]
  upload: UploadProgress
  processing: ProcessingProgress
  dataset: DatasetConfig
  review: ReviewConfig
}

export type ApiStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected'
  | 'working'
  | 'deleting'
  | 'uninitialized'

export interface ApiConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
}

export interface ApiSession {
  accessToken: string
  expiryTime: number
  accountId: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ConnectionState {
  status: ApiStatus
  lastError: string | null
  retryCount: number
  lastConnected: Date | null
}

export interface EyepopSDKOptions {
  onStatusChange: (status: ApiStatus) => void
  onError: (error: Error) => void
  config: ApiConfig
}
