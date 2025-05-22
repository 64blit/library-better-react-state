import { ReportState } from '@store/ReportStore'
import { ReportStateController } from '@controllers/report/state/ReportStateController'

import {
  NavigationState,
  StepTransition,
  StepValidationRules,
  ReportWizardStep,
} from './types'

export class NavigationController {
  private validationRules: Record<ReportWizardStep, StepValidationRules>
  private history: ReportWizardStep[]
  private isTransitioning: boolean
  private stepMap: Record<ReportWizardStep, ReportWizardStep>
  constructor() {
    if (!ReportStateController.instance) {
      throw new Error('StateController instance not initialized')
    }

    const startState = ReportStateController.instance.getState() as ReportState
    this.history = startState?.history?.slice(-3) ?? []

    this.isTransitioning = false

    this.stepMap = {
      viewAllReports: 'create',
      create: 'defineDetails',
      defineDetails: 'uploading',
      uploading: 'reviewDetails',
      reviewDetails: 'processing',
      processing: 'results',
      results: 'reviewGrid',
      reviewGrid: 'results',
      help: 'results',
    }

    this.validationRules = {
      viewAllReports: {
        canProceed: (state: ReportState) => true,
        canGoBack: () => false,
        requiredFields: [],
      },
      create: {
        canProceed: (state: ReportState) => state.fields.source !== null,
        canGoBack: () => false,
        requiredFields: ['fields.source', 'fields.name'],
      },
      defineDetails: {
        canProceed: (state: ReportState) =>
          state.fields.label !== '' && state.fields?.properties?.length > 0,
        canGoBack: () => true,
        requiredFields: ['fields.label', 'fields.properties'],
      },
      uploading: {
        canProceed: (state: ReportState) =>
          state.assets.upload.uploadProgress === 100,
        canGoBack: () => true,
        requiredFields: ['uploadProgress'],
      },
      reviewDetails: {
        canProceed: (state: ReportState) => true,
        canGoBack: () => true,
        requiredFields: [],
      },
      processing: {
        canProceed: (state: ReportState) =>
          state.assets.processing.processingProgress === 100,
        canGoBack: () => true,
        requiredFields: ['results'],
      },
      results: {
        canProceed: (state: ReportState) => false,
        canGoBack: () => true,
        requiredFields: [],
      },
      reviewGrid: {
        canProceed: (state: ReportState) => true,
        canGoBack: () => true,
        requiredFields: [],
      },
      help: {
        canProceed: (state: ReportState) => true,
        canGoBack: () => true,
        requiredFields: [],
      },
    }
  }

  public getCurrentStep(): ReportWizardStep {
    const currentState =
      ReportStateController.instance.getState() as ReportState
    return currentState.currentStep as ReportWizardStep
  }

  public getStep(index: number): ReportWizardStep {
    return Object.keys(this.stepMap)[index] as ReportWizardStep
  }

  public getCurrentStepNumber(): number {
    return Object.keys(this.stepMap).indexOf(this.getCurrentStep())
  }

  public getTotalSteps(): number {
    return Object.keys(this.stepMap).length
  }

  public getHistory(): ReportWizardStep[] {
    return [...this.history]
  }

  public canProceed(state: ReportState): boolean {
    return this.validationRules[state.currentStep].canProceed(state)
  }

  public canGoBack(): boolean {
    return this.validationRules[this.getCurrentStep()].canGoBack()
  }

  public getRequiredFields(): string[] {
    return this.validationRules[this.getCurrentStep()].requiredFields
  }

  public getNextStep(currentStep: ReportWizardStep): ReportWizardStep {
    return this.stepMap[currentStep]
  }

  public getPreviousStep(): ReportWizardStep | null {
    if (this.history.length < 1) return null
    return this.history[this.history.length - 1]
  }

  public async transition(transition: StepTransition): Promise<{
    currentStep: ReportWizardStep
    history: ReportWizardStep[]
  }> {
    if (this.isTransitioning) {
      throw new Error('Already transitioning between steps')
    }

    const { from, to, direction } = transition
    const currentState =
      ReportStateController.instance.getState() as ReportState

    if (from !== currentState.currentStep) {
      throw new Error(
        `Invalid transition: incorrect starting step: ${from} !== ${currentState.currentStep}`
      )
    }

    // For forward direction, check validation
    if (direction === 'forward' && !this.canProceed(currentState)) {
      throw new Error('Cannot proceed: required fields are missing')
    }

    try {
      this.isTransitioning = true

      if (direction === 'forward') {
        // Add the destination step to history regardless of sequence
        this.history.push(to as ReportWizardStep)
      } else {
        // Remove the current step from history when going back
        this.history.pop()
      }
    } finally {
      this.isTransitioning = false
    }
    // Update the state with the new step
    return {
      currentStep: to as ReportWizardStep,
      history: this.history,
    }
  }

  /**
   * Force navigation to a specific step, bypassing validation rules
   */
  public async goToStep(targetStep: ReportWizardStep): Promise<{
    currentStep: ReportWizardStep
    history: ReportWizardStep[]
  }> {
    if (this.isTransitioning) {
      throw new Error('Already transitioning between steps')
    }

    try {
      this.isTransitioning = true

      // Add target step to history
      this.history.push(targetStep)
      this.history = this.history?.slice(-3)

      // Update the state with the new step
      console.log('📫NavigationController.ts:187/(targetStep):', targetStep)

      return {
        currentStep: targetStep,
        history: this.history,
      }
    } finally {
      this.isTransitioning = false
    }
  }

  public reset(): void {
    this.history = ['create']
    this.isTransitioning = false
  }
}
