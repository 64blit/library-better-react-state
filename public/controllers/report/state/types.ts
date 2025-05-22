import { ReportWizardStep } from '@controllers/report/navigation/types'
import { ReportState } from '@store/ReportStore'

export interface ReportFields {
  name?: string
  description?: string
  source?: string
  label?: string | null
  properties?: Array<{ name: string }>
  customPrompt?: string
  estimatedTime?: string
  price?: number
  location?: string
}

export interface ApiStatus {
  [key: string]: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'
}

export type { ReportState }

export interface StorageOptions {
  key: string
  storage: Storage | null
  version: number
  migrate?: (state: any, version: number) => ReportState
}
