import { ReportWizardStep } from '@controllers/report/navigation/types'
import { ApiStatus } from '@controllers/sdk/types'
import { EyePopSDK } from '@controllers/sdk/EyePopSDK'
import { AssetCacheController } from '@controllers/sdk/AssetCacheController'

import { NavigationController } from '@controllers/report/navigation/NavigationController'
import {
  Asset,
  Dataset,
  ListWorkFlowItem,
  TranscodeMode,
} from '@eyepop.ai/eyepop'
import { ReportState } from '@store/ReportStore'
import { ReportStateController } from '@controllers/report/state/ReportStateController'
import { ReportDatasetCard } from '@controllers/sdk/eyepop/EyePopReports'

export class ReportManager {
  public update: (key?: string, value?: any) => void
  private navigationController: NavigationController
  private eyepopSDK: EyePopSDK
  private assetCacheController: AssetCacheController
  private static stateController: ReportStateController<ReportState>
  public static instance: ReportManager | null = null

  constructor(
    update: (key?: string, value?: any) => void,
    getState: () => ReportState,
    setState: (state: Partial<ReportState>) => void,
    eyepopSDK: EyePopSDK
  ) {
    if (ReportManager.instance) {
      return ReportManager.instance
    }

    ReportManager.instance = this

    this.update = update
    this.eyepopSDK = eyepopSDK

    this.initialize(getState, setState)
  }

  public async initialize(
    getState: () => ReportState,
    setState: (state: Partial<ReportState>) => void
  ): Promise<void> {
    try {
      // Initialize state controller first
      ReportManager.stateController = new ReportStateController(
        getState,
        setState,
        this.update
      )

      const state = getState()

      if (!state) {
        throw new Error('State is not initialized in ReportWizardManager')
      }

      this.assetCacheController = new AssetCacheController()
      this.navigationController = new NavigationController()

      this.update()
    } catch (error) {
      console.error('Error initializing ReportWizardManager:', error)
    }
  }

  // Navigation Methods
  public getCurrentStep(): ReportWizardStep {
    return this.navigationController.getCurrentStep()
  }

  public getCurrentStepNumber(): number {
    return this.navigationController.getCurrentStepNumber()
  }

  public getTotalSteps(): number {
    return this.navigationController.getTotalSteps()
  }

  public async nextStep(): Promise<void> {
    let currentStep = this.navigationController.getCurrentStep()
    const nextStep = this.navigationController.getNextStep(currentStep)
    if (!nextStep) return
    this.goToStep(nextStep)
  }

  public async previousStep(): Promise<void> {
    const previousStep = this.navigationController.getPreviousStep()
    if (!previousStep) return

    this.goToStep(previousStep)
  }

  public async goToStep(
    step: ReportWizardStep,
    force: boolean = true
  ): Promise<void> {
    let newStep: ReportWizardStep
    let newHistory: ReportWizardStep[]

    if (force) {
      const { currentStep, history } =
        await this.navigationController.goToStep(step)
      newStep = currentStep
      newHistory = history
    } else {
      const { currentStep, history } =
        await this.navigationController.transition({
          from: this.navigationController.getCurrentStep(),
          to: step,
        })
      newStep = currentStep
      newHistory = history
    }

    ReportManager.stateController.updateState({
      currentStep: newStep,
      history: newHistory,
    })

    this.update()
  }

  public async getReportDatasets(
    useCache: boolean = true
  ): Promise<ReportDatasetCard[]> {
    return await this.eyepopSDK.getReportController().listAll(useCache)
  }

  public async getRunningWorkflows(): Promise<ListWorkFlowItem[]> {
    return await this.eyepopSDK.getReportController().listWorkflows(true)
  }

  public async startWorkflow(
    reportName: string = 'image-contents-latest'
  ): Promise<void> {
    const currentState = ReportManager.stateController.getState() as ReportState
    const reportId = currentState.reportId
    const report = await this.getReportDataset(reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    await this.eyepopSDK
      .getReportController()
      .startWorkflow(this.eyepopSDK.getAccountUUID(), reportName)
  }

  public async getReportDataset(datasetUUID: string): Promise<Dataset> {
    return await this.eyepopSDK
      .getReportController()
      .getReportDataset(datasetUUID, false)
  }

  public async selectReport(reportId: string): Promise<void> {
    const reportDataset = await this.getReportDataset(reportId)
    if (!reportDataset) {
      throw new Error('Report not found')
    }

    const currentState = ReportManager.stateController.getState() as ReportState
    currentState.reportId = reportDataset.uuid
    currentState.fields.name = reportDataset?.name
    currentState.fields.description = reportDataset?.description
    currentState.assets.dataset.uuid = reportDataset.uuid
    currentState.assets.dataset.version = reportDataset.modifiable_version

    const reportData = reportDataset?.tags?.find((tag) =>
      tag.startsWith('report_data:')
    )

    if (reportData) {
      const reportDataObject = JSON.parse(reportData.split('report_data:')[1])

      currentState.fields.label = reportDataObject.label
      currentState.fields.properties = reportDataObject.properties
    }

    ReportManager.stateController.updateState(currentState)

    this.eyepopSDK.setActiveDataset(
      reportDataset.uuid,
      reportDataset.modifiable_version
    )
  }

  public async createReport(name: string, description: string): Promise<void> {
    const datasetUUID = await this.eyepopSDK.createDataset(name, undefined, [
      'report_pop',
    ])

    const currentState = ReportManager.stateController.getState() as ReportState
    currentState.reportId = datasetUUID
    currentState.fields.name = name
    currentState.assets.dataset.uuid = datasetUUID
    currentState.assets.dataset.version = 1
    ReportManager.stateController.setState(currentState)

    this.update()
  }

  // File Upload Methods
  public async uploadFiles(files: File[]): Promise<Asset[]> {
    try {
      const assets = await this.assetCacheController.uploadFiles(files)
      this.update()
      return assets
    } catch (error) {
      console.error('ReportWizardManager: Error uploading files', error)
      this.setError(error instanceof Error ? error.message : String(error))
    }
  }

  // API Status Methods
  private updateEyePopStatus = (status: ApiStatus): void => {
    const state = ReportManager.stateController.getState() as ReportState
    ReportManager.stateController.updateState({
      status: { eyepop: status },
    })
  }

  // Error Handling
  public setError(error: string | null): void {
    ReportManager.stateController.setError(error)
    this.update()
  }

  // Cleanup
  public cleanup(): void {
    this.eyepopSDK?.cleanup()
    this.assetCacheController?.cleanup()
  }

  // Getters for individual controllers
  public getNavigationController(): NavigationController {
    return this.navigationController
  }

  public getEyePopSDK(): EyePopSDK {
    return this.eyepopSDK
  }

  public getDataController(): AssetCacheController {
    return this.assetCacheController
  }

  public getStateController(): ReportStateController<ReportState> {
    return ReportManager.stateController
  }

  public retry(): void {
    this.cleanup()
    this.initialize(
      ReportManager.stateController.getState as () => ReportState,
      ReportManager.stateController.setState
    )
  }
}
