import { toast } from 'react-toastify'
import {
  DataEndpoint,
  EyePop,
  Dataset,
  DatasetCreate,
  TranscodeMode,
  Asset,
  ChangeEvent,
  DatasetUpdate,
  EndpointState,
  ModelCreate,
  ModelUpdate,
  Model,
  UserReview,
} from '@eyepop.ai/eyepop'
import { ApiStatus, ApiConfig, ApiSession, ConnectionState } from './types'
import { EyePopReports } from './eyepop/EyePopReports'
import { EyePopSST } from './eyepop/EyePopSST'

export class EyePopSDK {
  public endpoint: DataEndpoint | null = null
  private accountUUID: string | null = null
  private accessToken: string | null = null
  private validUntil: number | null = null
  private datasetUUID: string | null = null
  private datasetVersion: number | null = null

  private datasetSubscription: any | null = null
  private connectionState: ConnectionState
  private onStatusChange: (status: ApiStatus) => void
  private config: ApiConfig

  private reports: EyePopReports
  private sst: EyePopSST

  constructor(onStatusChange: (status: ApiStatus) => void) {
    this.onStatusChange = onStatusChange
    this.connectionState = {
      status: 'uninitialized',
      lastError: null,
      retryCount: 0,
      lastConnected: null,
    }

    const eyepopUrl = process.env.NEXT_PUBLIC_WEB_API_URL?.replace(
      '/api/v1',
      ''
    )
    this.config = {
      baseUrl: eyepopUrl || 'https://api.eyepop.ai',
      timeout: 30000,
    }

    this.reports = new EyePopReports(this)
    this.sst = new EyePopSST(this)
  }

  public getConnectionState(): ApiStatus {
    return this.connectionState.status
  }

  async connect(): Promise<void> {
    const currentStatus = this.getStatus()

    if (currentStatus !== 'uninitialized') {
      console.info('EyePopSDKManager: Already connected or connecting now')
      return
    }

    if (!this.accountUUID || !this.accessToken) {
      console.warn('EyePopSDKManager: No account ID or access token available')
      this.updateStatus('uninitialized')
      return
    }

    try {
      const authDetails = {
        session: {
          eyepopUrl: this.config.baseUrl,
          accessToken: this.accessToken,
          validUntil: this.validUntil,
        },
      }

      this.updateStatus('connecting')

      const endpoint = EyePop.dataEndpoint({
        auth: authDetails,
        accountId: this.accountUUID,
      })

      endpoint.onStateChanged((state: EndpointState) => {
        console.log('EyePopSDKManager: Endpoint state changed:', state)

        // Directly check current status from source
        const currentStatus = this.getStatus()

        // If we're connecting and the endpoint is idle, we've successfully connected
        if (currentStatus === 'connecting' && state === EndpointState.Idle) {
          this.updateStatus('connected')
          return
        }

        // Otherwise, map endpoint states to API states
        let newStatus: ApiStatus
        switch (state) {
          case EndpointState.Idle:
            newStatus = 'idle'
            break
          case EndpointState.Busy:
            newStatus = 'working'
            break
          case EndpointState.Authenticating:
            newStatus = 'connecting'
            break
          case EndpointState.Error:
          case EndpointState.NotAvailable:
            newStatus = 'error'
            break
          default:
            newStatus = 'idle'
        }

        this.updateStatus(newStatus)
      })

      this.endpoint = await endpoint.connect().catch((error) => {
        console.error('EyePopSDKManager: Connection failed:', error)
        this.updateStatus('error')
        throw error
      })
    } catch (error) {
      console.error('EyePopSDKManager: Connection failed:', error)
      this.updateStatus('error')
      throw error
    }
  }

  public getReportController(): EyePopReports {
    return this.reports
  }

  public getSSTController(): EyePopSST {
    return this.sst
  }

  public updateStatus(newStatus: ApiStatus) {
    // Update internal state first
    this.connectionState.status = newStatus
    if (newStatus === 'connected') {
      this.connectionState.lastConnected = new Date()
      this.connectionState.retryCount = 0
    } else if (newStatus === 'error') {
      this.connectionState.retryCount++
    }
    // Then call the callback if it exists

    this.onStatusChange(newStatus)
  }

  public getStatus(): ApiStatus {
    return this.connectionState.status
  }

  async assertConnected(): Promise<void> {
    if (!this.endpoint) {
      throw new Error('SDK not initialized')
    }
  }

  async setupDatasetSubscription(
    datasetUUID: string,
    handler: (event: ChangeEvent) => Promise<void>
  ): Promise<void> {
    await this.assertConnected()

    if (!datasetUUID) {
      console.warn(
        'EyePopSDKManager: Cannot setup websocket - dataset not initialized'
      )
      return
    }

    try {
      if (this.datasetSubscription) {
        this.endpoint?.removeAllDatasetEventHandlers(datasetUUID)
      }

      this.datasetSubscription = this.endpoint!.addDatasetEventHandler(
        datasetUUID,
        handler
      )
    } catch (error) {
      console.error(
        'EyePopSDKManager: Failed to setup dataset subscription',
        error
      )
      throw error
    }
  }

  async uploadAsset(
    datasetUuid: string,
    datasetVersion: number | undefined,
    file: File,
    filename: string
  ): Promise<Asset> {
    await this.assertConnected()

    if (!datasetUuid) {
      throw new Error('No dataset available for upload')
    }

    try {
      const result = this.endpoint!.uploadAsset(
        datasetUuid,
        datasetVersion,
        file,
        filename
      )
      return result
    } catch (error) {
      console.error('EyePopSDKManager: Failed to upload asset', error)
      throw error
    }
  }

  // get a dataset by uuid
  async getDataset(
    datasetUUID: string,
    datasetVersion?: number,
    includeStats: boolean = true,
    modifiableVersionOnly: boolean = true
  ): Promise<Dataset> {
    await this.assertConnected()

    return await this.endpoint!.getDataset(
      datasetUUID,
      includeStats,
      datasetVersion,
      modifiableVersionOnly
    )
  }

  async deleteDataset(datasetUUID: string): Promise<void> {
    await this.assertConnected()
    this.updateStatus('deleting')
    try {
      await this.endpoint!.deleteDataset(datasetUUID)
      this.updateStatus('idle')
    } catch (error) {
      console.error('EyePopSDKManager: Failed to delete dataset', error)
      this.updateStatus('error')
      throw error
    }
  }

  // list all datasets
  async listDatasets(
    includeStats: boolean = true,
    modifiableVersionOnly: boolean = true
  ): Promise<Dataset[]> {
    await this.assertConnected()

    return await this.endpoint!.listDatasets(
      includeStats,
      modifiableVersionOnly
    )
  }

  async listAssets(
    datasetUUID: string = this.datasetUUID,
    datasetVersion: number = this.datasetVersion
  ): Promise<Asset[]> {
    console.log('EyePopSDKManager: Listing assets for dataset', datasetUUID)
    await this.assertConnected()

    if (!datasetUUID) {
      throw new Error('No dataset available for asset retrieval')
    }

    try {
      return (
        await this.endpoint!.listAssets(datasetUUID, datasetVersion, true)
      )?.slice(0, 5000)
    } catch (error) {
      console.error('EyePopSDKManager: Failed to get assets', error)
      throw error
    }
  }

  /**
   * Get an asset
   * @param assetUUID Asset UUID
   * @param datasetUUID Dataset UUID (optional)
   * @param datasetVersion Dataset version (optional)
   * @param includeAnnotations Whether to include annotations (optional)
   * @returns Asset
   */
  public async getAsset(
    assetUUID: string,
    datasetUUID: string = this.datasetUUID,
    datasetVersion: number = this.datasetVersion,
    includeAnnotations: boolean = false
  ): Promise<Asset | null> {
    await this.assertConnected()

    if (!datasetUUID) {
      return null
    }

    try {
      return await this.endpoint!.getAsset(
        assetUUID,
        datasetUUID,
        datasetVersion,
        includeAnnotations
      )
    } catch (error) {
      console.error('EyePopSDKManager: Failed to get asset', error)
      return null
    }
  }

  async downloadAssetBlob(
    assetUUID: string,
    datasetUUID: string,
    datasetVersion?: number,
    type: TranscodeMode = TranscodeMode.image_cover_1024
  ): Promise<Blob | null> {
    await this.assertConnected()

    if (!datasetUUID) {
      throw new Error('No dataset specified')
    }

    try {
      return await this.endpoint!.downloadAsset(
        assetUUID,
        datasetUUID,
        datasetVersion,
        type
      )
    } catch (error) {
      console.error('EyePopSDKManager: Failed to download asset blob', error)
    }
  }

  async disconnect(): Promise<void> {
    if (this.datasetSubscription && this.datasetUUID) {
      try {
        this.datasetSubscription = null
        this.endpoint?.removeAllDatasetEventHandlers(this.datasetUUID)
      } catch (error) {
        console.error(
          'EyePopSDKManager: Error removing dataset subscription',
          error
        )
      }
    }

    if (this.endpoint) {
      try {
        await this.endpoint.disconnect()
        this.updateStatus('disconnected')
        this.connectionState.status = 'disconnected'
      } catch (error) {
        console.error(
          'EyePopSDKManager: Error disconnecting from endpoint',
          error
        )
      }
    }

    this.endpoint = null
  }

  // Getters and setters
  getAccountUUID(): string | null {
    return this.accountUUID
  }

  getDatasetUUID(): string | null {
    return this.datasetUUID
  }

  getDatasetVersion(): number | null {
    return this.datasetVersion
  }

  setAccountId(accountId: string): void {
    this.accountUUID = accountId
  }

  setSession(accessToken: string, validUntil: Date | string): void {
    this.accessToken = accessToken

    this.validUntil = validUntil
      ? validUntil instanceof Date
        ? validUntil.getTime()
        : new Date(validUntil).getTime()
      : Date.now() + 3600000000
  }

  setActiveDataset(datasetUUID: string, datasetVersion: number): void {
    this.datasetUUID = datasetUUID
    this.datasetVersion = datasetVersion
  }

  async createDataset(
    name: string,
    properties?: string[],
    tags?: string[]
  ): Promise<string> {
    await this.assertConnected()

    try {
      const dataset: DatasetCreate = {
        name,
        auto_annotate_params: {
          candidate_labels: properties,
        },
        tags,
      }

      const createdDataset = await this.endpoint!.createDataset(dataset)
      this.datasetUUID = createdDataset.uuid
      this.datasetVersion = createdDataset.versions[0].version

      return createdDataset.uuid
    } catch (error) {
      console.error('EyePopSDKManager: Failed to create dataset', error)
      throw error
    }
  }

  async updateDataset(
    datasetUUID: string,
    update: DatasetUpdate,
    startAutoAnnotate: boolean = false
  ): Promise<void> {
    await this.assertConnected()

    try {
      await this.endpoint!.updateDataset(datasetUUID, update, startAutoAnnotate)
    } catch (error) {
      console.error('EyePopSDKManager: Failed to update dataset', error)
      throw error
    }
  }

  async startAutoAnnotate(
    datasetUUID: string,
    datasetVersion?: number
  ): Promise<void> {
    await this.assertConnected()

    if (!datasetUUID) {
      throw new Error('No dataset UUID provided')
    }

    try {
      const update: DatasetUpdate = {
        auto_annotates: ['auto'],
      }
      await this.endpoint!.updateDataset(datasetUUID, update, true)
    } catch (error) {
      console.error('EyePopSDKManager: Failed to start auto-annotation', error)
      throw error
    }
  }

  public cleanup(): void {
    this.disconnect().catch((error) => {
      console.error('🍩EyePopSDK.ts:469/Error during cleanup:', error)
    })
  }

  /**
   * Create a model
   * @param datasetUUID Dataset UUID
   * @param datasetVersion Dataset version
   * @param modelData Model creation data
   * @param startTraining Whether to start training immediately
   * @returns Created model
   */
  public async createModel(
    modelCreateData: ModelCreate,
    datasetUUID: string = this.datasetUUID,
    datasetVersion: number = this.datasetVersion,
    startTraining: boolean = true
  ): Promise<Model> {
    await this.assertConnected()

    try {
      // The createModel method in the endpoint directly takes all the needed params
      const model = await this.endpoint!.createModel(
        datasetUUID,
        datasetVersion,
        modelCreateData,
        startTraining
      )

      return model
    } catch (error) {
      console.error('EyePopSDKManager: Failed to create model', error)
      throw error
    }
  }

  /**
   * List all models
   * @returns List of models
   */
  public async listModels(): Promise<Model[]> {
    await this.assertConnected()

    try {
      return await this.endpoint!.listModels()
    } catch (error) {
      console.error('EyePopSDKManager: Failed to list models', error)
      throw error
    }
  }

  /**
   * Get a model by UUID
   * @param modelUUID Model UUID
   * @returns Model details
   */
  public async getModel(modelUUID: string): Promise<Model> {
    await this.assertConnected()

    try {
      return await this.endpoint!.getModel(modelUUID)
    } catch (error) {
      console.error('EyePopSDKManager: Failed to get model', error)
      throw error
    }
  }

  /**
   * Update a model
   * @param modelUUID Model UUID
   * @param modelData Update data
   * @returns Updated model
   */
  public async updateModel(
    modelUUID: string,
    modelData: ModelUpdate
  ): Promise<Model> {
    await this.assertConnected()

    try {
      return await this.endpoint!.updateModel(modelUUID, modelData)
    } catch (error) {
      console.error('EyePopSDKManager: Failed to update model', error)
      throw error
    }
  }

  /**
   * Delete a model
   * @param modelUUID Model UUID
   * @returns Success status
   */
  public async deleteModel(modelUUID: string): Promise<any> {
    await this.assertConnected()

    try {
      return await this.endpoint!.deleteModel(modelUUID)
    } catch (error) {
      console.error('EyePopSDKManager: Failed to delete model', error)
      throw error
    }
  }

  /**
   * Publish a model
   * @param modelUUID Model UUID
   * @returns Published model
   */
  public async publishModel(modelUUID: string): Promise<Model> {
    await this.assertConnected()

    try {
      return await this.endpoint!.publishModel(modelUUID)
    } catch (error) {
      console.error('EyePopSDKManager: Failed to publish model', error)
      throw error
    }
  }

  /**
   * Get model training progress
   * @param modelUUID Model UUID
   * @returns Training progress information
   */
  public async getModelTrainingProgress(modelUUID: string): Promise<any> {
    await this.assertConnected()

    try {
      return await this.endpoint!.getModelTrainingProgress(modelUUID)
    } catch (error) {
      console.error(
        'EyePopSDKManager: Failed to get model training progress',
        error
      )
      throw error
    }
  }

  /**
   * Update asset ground truth annotation
   * @param assetUUID Asset UUID
   * @param datasetUUID Dataset UUID
   * @param datasetVersion Dataset version
   * @param annotation Annotation data
   */
  public async updateAssetGroundTruth(
    assetUUID: string,
    datasetUUID: string,
    datasetVersion: number,
    annotation: any
  ): Promise<any> {
    await this.assertConnected()

    try {
      return await this.endpoint!.updateAssetGroundTruth(
        assetUUID,
        datasetUUID,
        datasetVersion,
        annotation
      )
    } catch (error) {
      console.error(
        'EyePopSDKManager: Failed to update asset ground truth',
        error
      )
      throw error
    }
  }

  /**
   * Update auto annotation status for an asset
   * @param assetUUID Asset UUID
   * @param autoAnnotateType Auto annotation type
   * @param userReview User review status
   * @param confidenceThreshold Confidence threshold
   */
  public async updateAutoAnnotationStatus(
    assetUUID: string,
    autoAnnotateType: string,
    userReview: UserReview,
    confidenceThreshold?: number
  ): Promise<any> {
    await this.assertConnected()

    try {
      return await this.endpoint!.updateAutoAnnotationStatus(
        assetUUID,
        autoAnnotateType,
        userReview,
        confidenceThreshold
      )
    } catch (error) {
      console.error(
        'EyePopSDKManager: Failed to update auto annotation status',
        error
      )
      throw error
    }
  }
}
