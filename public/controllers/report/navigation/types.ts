import { ReportState } from '@store/ReportStore'
import { SSTState } from '@store/SSTStore'

export type ReportWizardStep =
  | 'viewAllReports'
  | 'create'
  | 'defineDetails'
  | 'reviewDetails'
  | 'uploading'
  | 'processing'
  | 'results'
  | 'reviewGrid'
  | 'help'
export enum SSTWizardSteps {
  ModelList = 'modelList',
  ModelTypeSelection = 'modelTypeSelection',
  Create = 'create',
  Upload = 'upload',
  PromptTester = 'promptTester',
  AutoLabelLoading = 'autoLabelLoading',
  AutoLabel = 'autoLabel',
  ConfirmAutoLabel = 'confirmAutoLabel',
  AugmentationQuiz = 'augmentationQuiz',
  PostTraining = 'postTraining',
  Deploy = 'deploy',
  Edit = 'edit',
  TrainingProgress = 'trainingProgress',
  Debug = 'debug',
}

export type SSTWizardStep = SSTWizardSteps

export interface NavigationState {
  currentStep: SSTWizardStep
  history: SSTWizardStep[]
  isTransitioning: boolean
}

export interface StepTransition {
  from: ReportWizardStep | SSTWizardStep
  to: ReportWizardStep | SSTWizardStep
  direction?: 'forward' | 'backward'
}

export interface StepValidationRules {
  canProceed: (state: ReportState | SSTState) => boolean
  canGoBack: () => boolean
  requiredFields: string[]
}
