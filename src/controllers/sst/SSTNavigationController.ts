import { SSTWizardSteps } from '@controllers/report/navigation/types'
import { SSTState } from '@store/SSTStore'

/**
 * Controller responsible for handling navigation within the SST wizard
 */
export class SSTNavigationController {
  private getState: () => SSTState
  private setState: (state: Partial<SSTState>) => void

  constructor(
    getState: () => SSTState,
    setState: (state: Partial<SSTState>) => void
  ) {
    this.getState = getState
    this.setState = setState
  }

  getCurrentStep(): SSTWizardSteps {
    return this.getState().currentStep as SSTWizardSteps
  }

  goToStep(step: SSTWizardSteps): void {
    this.setState({ currentStep: step })
  }

  goToNext(): void {
    const currentStep = this.getCurrentStep()
    switch (currentStep) {
      case SSTWizardSteps.Create:
        this.goToStep(SSTWizardSteps.Upload)
        break
      case SSTWizardSteps.Upload:
        this.goToStep(SSTWizardSteps.PromptTester)
        break
      case SSTWizardSteps.PromptTester:
        this.goToStep(SSTWizardSteps.AutoLabelLoading)
        break
      case SSTWizardSteps.AutoLabelLoading:
        this.goToStep(SSTWizardSteps.AutoLabel)
        break
      case SSTWizardSteps.AutoLabel:
        this.goToStep(SSTWizardSteps.ConfirmAutoLabel)
        break
      case SSTWizardSteps.ConfirmAutoLabel:
        this.goToStep(SSTWizardSteps.AugmentationQuiz)
        break
      case SSTWizardSteps.AugmentationQuiz:
        this.goToStep(SSTWizardSteps.TrainingProgress)
        break
      case SSTWizardSteps.TrainingProgress:
        this.goToStep(SSTWizardSteps.PostTraining)
        break
      case SSTWizardSteps.PostTraining:
        this.goToStep(SSTWizardSteps.Deploy)
        break
      case SSTWizardSteps.Deploy:
        // Final step
        break
      case SSTWizardSteps.Edit:
        // Edit step navigation depends on context
        break
      case SSTWizardSteps.Debug:
        // Debug step navigation depends on context
        break
      default:
        console.warn(`Unknown step: ${currentStep}`)
    }
  }

  goToPrevious(): void {
    const currentStep = this.getCurrentStep()
    switch (currentStep) {
      case SSTWizardSteps.Deploy:
        this.goToStep(SSTWizardSteps.PostTraining)
        break
      case SSTWizardSteps.PostTraining:
        this.goToStep(SSTWizardSteps.TrainingProgress)
        break
      case SSTWizardSteps.TrainingProgress:
        this.goToStep(SSTWizardSteps.AugmentationQuiz)
        break
      case SSTWizardSteps.AugmentationQuiz:
        this.goToStep(SSTWizardSteps.ConfirmAutoLabel)
        break
      case SSTWizardSteps.ConfirmAutoLabel:
        this.goToStep(SSTWizardSteps.AutoLabel)
        break
      case SSTWizardSteps.AutoLabel:
        this.goToStep(SSTWizardSteps.AutoLabelLoading)
        break
      case SSTWizardSteps.AutoLabelLoading:
        this.goToStep(SSTWizardSteps.PromptTester)
        break
      case SSTWizardSteps.PromptTester:
        this.goToStep(SSTWizardSteps.Upload)
        break
      case SSTWizardSteps.Upload:
        this.goToStep(SSTWizardSteps.Create)
        break
      case SSTWizardSteps.Create:
        // First step
        break
      case SSTWizardSteps.Edit:
        // Edit step navigation depends on context
        break
      case SSTWizardSteps.Debug:
        // Debug step navigation depends on context
        break
      default:
        console.warn(`Unknown step: ${currentStep}`)
    }
  }

  canGoToNext(): boolean {
    const currentStep = this.getCurrentStep()
    const state = this.getState()

    switch (currentStep) {
      case SSTWizardSteps.Create:
        return Boolean(state.fields.name && state.fields.description)
      case SSTWizardSteps.Upload:
        return state.assets.assets.length > 0
      case SSTWizardSteps.PromptTester:
        return true // Depends on whether a prompt is selected
      case SSTWizardSteps.AutoLabelLoading:
        return true // This is automatic
      case SSTWizardSteps.AutoLabel:
        return true // Need to check if auto-labeling is complete
      case SSTWizardSteps.ConfirmAutoLabel:
        return true // Based on confirmation
      case SSTWizardSteps.AugmentationQuiz:
        return true // Based on quiz completion
      case SSTWizardSteps.TrainingProgress:
        return state.assets.processing.processingProgress === 100
      case SSTWizardSteps.PostTraining:
        return true // Based on post-training steps
      case SSTWizardSteps.Deploy:
        return false // Final step
      case SSTWizardSteps.Edit:
        return false // Depends on edit context
      case SSTWizardSteps.Debug:
        return false // Depends on debug context
      default:
        return false
    }
  }

  canGoToPrevious(): boolean {
    const currentStep = this.getCurrentStep()
    return currentStep !== SSTWizardSteps.Create
  }

  /**
   * Navigate to the model list view
   */
  navigateToModelList() {
    // Update URL without the step parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('step')
      window.history.replaceState({}, '', url.toString())
    }

    this.setState({
      currentStep: SSTWizardSteps.ModelList,
      model: null,
      modelUUID: null,
    })
  }

  /**
   * Set the URL parameters based on the current state
   */
  updateURLParams() {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const state = this.getState()

    if (state.currentStep && state.currentStep !== SSTWizardSteps.ModelList) {
      url.searchParams.set('step', state.currentStep)
    } else {
      url.searchParams.delete('step')
    }

    if (state.modelUUID) {
      url.searchParams.set('modelId', state.modelUUID)
    } else {
      url.searchParams.delete('modelId')
    }

    if (state.datasetUUID) {
      url.searchParams.set('datasetId', state.datasetUUID)
    } else {
      url.searchParams.delete('datasetId')
    }

    window.history.replaceState({}, '', url.toString())
  }
}
