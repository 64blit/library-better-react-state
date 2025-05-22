import { ReportWizardStep } from '../report/navigation/types'
import { ApiStatus } from '../sdk/types'
import { EyePopSDK } from '../sdk/EyePopSDK'
import { AssetCacheController } from '../sdk/AssetCacheController'
import { ReportStateController } from '@controllers/report/state/ReportStateController'

import {
  Asset,
  Dataset,
  TranscodeMode,
  Annotation,
  AnnotationType,
  UserReview,
  ModelTask,
  ModelCreate,
  Model,
} from '@eyepop.ai/eyepop'
import {
  SSTState,
  ReviewStatus,
  ReviewMode,
  WizardTypes,
} from '@store/SSTStore'
import { ReportState } from '@store/ReportStore'
import * as fabric from 'fabric'
import _ from 'lodash'
import { EyePopSST } from '../sdk/eyepop/EyePopSST'
import { SSTNavigationController } from './SSTNavigationController'
import { SSTWizardSteps } from '@controllers/report/navigation/types'

export class SSTManager {
  public update: (key?: string, value?: any) => void
  private navigationController: SSTNavigationController
  private eyepopSDK: EyePopSDK
  private eyepopSST: EyePopSST
  private assetCacheController: AssetCacheController
  private stateController: ReportStateController<SSTState>
  public static instance: SSTManager | null = null

  private mainImageRef: any = { current: null }

  constructor(
    update: (key?: string, value?: any) => void,
    getState: () => SSTState,
    setState: (state: Partial<SSTState>) => void,
    eyepopSDK: EyePopSDK
  ) {
    if (SSTManager.instance) {
      return SSTManager.instance
    }

    SSTManager.instance = this

    this.update = update
    this.eyepopSDK = eyepopSDK
    this.eyepopSST = eyepopSDK.getSSTController()
    this.initialize(getState, setState)
  }

  public async initialize(
    getState: () => SSTState,
    setState: (state: Partial<SSTState>) => void
  ): Promise<void> {
    try {
      // Initialize state controller first
      this.stateController = new ReportStateController(
        getState,
        setState,
        this.update
      )

      const state = getState()

      if (!state) {
        throw new Error('State is not initialized in SSTManager')
      }

      this.assetCacheController = new AssetCacheController()
      this.navigationController = new SSTNavigationController(
        getState,
        setState
      )

      if (!state.initialized) {
        this.eyepopSDK.connect()
        this.stateController.updateState({
          initialized: true,
        })
      }

      this.update()
    } catch (error) {
      console.error('Error initializing SSTManager:', error)
    }
  }

  // Navigation Methods
  public getCurrentStep(): SSTWizardSteps {
    return this.navigationController.getCurrentStep()
  }

  public async nextStep(): Promise<void> {
    const currentStep = this.navigationController.getCurrentStep()
    const state = this.stateController.getState()

    if (this.navigationController.canGoToNext()) {
      this.navigationController.goToNext()
      this.update()
    }
  }

  public async previousStep(): Promise<void> {
    const currentStep = this.navigationController.getCurrentStep()
    const state = this.stateController.getState()

    if (this.navigationController.canGoToPrevious()) {
      this.navigationController.goToPrevious()
      this.update()
    }
  }

  public async goToStep(
    step: SSTWizardSteps,
    force: boolean = true
  ): Promise<void> {
    if (force) {
      this.navigationController.goToStep(step)
    } else {
      this.navigationController.goToStep(step)
      this.navigationController.updateURLParams()
    }

    this.update()
  }

  // ===========================================================================
  // Dataset and Model Related Methods
  // ===========================================================================

  /**
   * Get all SST datasets with hero images
   */
  public async getSSTDatasets(): Promise<(Dataset & { heroImage: string })[]> {
    try {
      const datasets = await this.eyepopSDK.listDatasets(true, true)
      const sstDatasets = datasets.filter(
        (dataset) =>
          dataset.tags && dataset.tags.some((tag) => tag === 'sst_pop')
      )

      // Get hero images for each dataset
      const datasetsWithHeroImages = await Promise.all(
        sstDatasets.map(async (dataset) => {
          let heroImage = ''
          try {
            const assets = await this.eyepopSDK.listAssets(
              dataset.uuid,
              dataset.modifiable_version
            )
            if (assets && assets.length > 0) {
              const blob = await this.eyepopSDK.downloadAssetBlob(
                assets[0].uuid,
                dataset.uuid,
                dataset.modifiable_version,
                TranscodeMode.image_cover_1024
              )

              if (blob) {
                heroImage = URL.createObjectURL(blob)
              }
            }
          } catch (error) {
            console.error('Error getting hero image:', error)
          }

          return { ...dataset, heroImage }
        })
      )

      return datasetsWithHeroImages
    } catch (error) {
      console.error('Error getting SST datasets:', error)
      return []
    }
  }

  /**
   * Get a specific SST dataset
   */
  public async getSSTDataset(datasetUUID: string): Promise<Dataset> {
    try {
      return await this.eyepopSDK.getDataset(datasetUUID, undefined, true, true)
    } catch (error) {
      console.error('Failed to get SST dataset:', error)
      throw error
    }
  }

  public async selectSST(sstId: string): Promise<void> {
    const sst = await this.getSSTDataset(sstId)
    if (!sst) {
      throw new Error('SST not found')
    }

    const currentState = this.stateController.getState()

    this.stateController.updateState({
      sstId: sst.uuid,
      fields: {
        ...currentState.fields,
        name: sst.name,
        description: sst.description,
      },
      dataset: sst,
      datasetUUID: sst.uuid,
      datasetVersion: sst.modifiable_version,
    })

    const sstData = sst?.tags?.find((tag) => tag.startsWith('sst_data:'))

    if (sstData) {
      const sstDataObject = JSON.parse(sstData.split('sst_data:')[1])
      this.stateController.updateState({
        fields: {
          ...currentState.fields,
          label: sstDataObject.label,
          properties: sstDataObject.properties,
        },
      })
    }

    this.eyepopSDK.setActiveDataset(sst.uuid, sst.modifiable_version)

    this.update()
  }

  public async createSST(name: string, description: string): Promise<void> {
    const datasetUUID = await this.eyepopSDK.createDataset(name, undefined, [
      'sst_pop',
    ])

    const currentState = this.stateController.getState()
    this.stateController.updateState({
      sstId: datasetUUID,
      fields: {
        ...currentState.fields,
        name: name,
      },
      datasetUUID: datasetUUID,
      datasetVersion: 1,
    })
  }

  public async runSST(): Promise<void> {
    const currentState = this.stateController.getState()
    const sstId = currentState.sstId
    const sst = await this.getSSTDataset(sstId)
    if (!sst) {
      throw new Error('SST not found')
    }

    // Start model training
    await this.createModel(sstId, sst.name)
  }

  /**
   * Create a model based on the current dataset
   */
  public async createModel(
    datasetUUID: string,
    datasetName: string
  ): Promise<Model> {
    try {
      // Get current state
      const state = this.stateController.getState()

      // Find an existing pretrained model to use (optional)
      const pretrainedModelUUID = await this.findPretrainedModel(datasetUUID)

      // Determine model task based on wizard type (assuming object detection as default)
      const modelTask = ModelTask.object_detection

      // Prepare augmentation data
      const augmentationData = await this.getAugmentationData()

      // Create model data object
      const modelData: ModelCreate = {
        name: datasetName,
        description: new Date().toString(),
        task: modelTask,
        pretrained_model_uuid: pretrainedModelUUID,
        extra_params: {
          augment_intent: augmentationData,
        } as any, // Cast to any to bypass type checking
      }

      // Create the model using SDK
      const result = await this.eyepopSDK.createModel(modelData)

      // Update state with the new model UUID
      this.stateController.updateState({
        modelUUID: result.uuid,
      })

      this.update()

      return result
    } catch (error) {
      console.error('Failed to create model:', error)
      throw error
    }
  }

  /**
   * Find a suitable pretrained model to use for training
   */
  private async findPretrainedModel(
    datasetUUID: string
  ): Promise<string | null> {
    try {
      const models = await this.eyepopSST.listModels()

      // Filter models that are published and use the same dataset
      const filteredModels = models.filter(
        (model) =>
          model.status === 'published' && model.dataset_uuid === datasetUUID
      )

      if (!filteredModels || filteredModels.length === 0) {
        return null
      }

      // Sort by dataset version (newest first)
      filteredModels.sort((a, b) => b.dataset_version - a.dataset_version)

      // Get augmentation data from the current state
      const currentAugmentationData = await this.getAugmentationData()

      // Check if the newest model has the same augmentation settings
      const topModel = filteredModels[0]
      const modelExtraParams = topModel.extra_params as any
      const modelAugmentationData = modelExtraParams?.augment_intent

      if (
        modelAugmentationData &&
        JSON.stringify(currentAugmentationData) ===
          JSON.stringify(modelAugmentationData)
      ) {
        return topModel.uuid
      }

      return null
    } catch (error) {
      console.error('Error finding pretrained model:', error)
      return null
    }
  }

  /**
   * Get augmentation data for model training
   */
  private async getAugmentationData(): Promise<any> {
    // This would normally come from user selection or state
    // For now, return default augmentation settings
    return {
      brightness: true,
      contrast: true,
      saturation: false,
      hue: false,
      settings_saved: true,
    }
  }

  // ===========================================================================
  // Review Management Methods
  // ===========================================================================

  /**
   * Set main image reference
   */
  public setMainImage(image: any): void {
    this.mainImageRef.current = image
  }

  /**
   * Get all assets for the current dataset
   */
  public async getAllAssets(): Promise<string[]> {
    const state = this.stateController.getState()

    if (!state.datasetUUID) {
      console.error('No dataset UUID available')
      return []
    }

    try {
      const assets = await this.eyepopSDK.listAssets(
        state.datasetUUID,
        state.datasetVersion
      )
      const sst = this.eyepopSDK.getSSTController()
      const assetMap = {}

      const images: string[] = []

      for (const asset of assets) {
        sst.addToAssetMap(asset)
        images.push(asset.uuid)
      }

      const sortedImages = sst.sortByReviewPriority(images)

      this.stateController.updateState({
        images: sortedImages,
        assetMap: sst.getAssetMap(),
      })

      return sortedImages
    } catch (error) {
      console.error('Failed to get assets:', error)
      return []
    }
  }

  /**
   * Handle approve image operation
   */
  public async approveImage(assetUuid?: string): Promise<void> {
    const state = this.stateController.getState()

    if (!state.images || state.images.length === 0) {
      console.error('No images loaded')
      return
    }

    const currentImage = state.mainImage
    const uuid = assetUuid ?? currentImage?.uuid

    if (!uuid) return

    const asset = state.assetMap[uuid]

    // Mark the overall image as approved
    currentImage.approved = true
    asset.approved = true

    // Separate annotations into ground-truth and auto-annotations
    let gtAnnotations = currentImage.annotations.filter(
      (a: Annotation) => a.type === AnnotationType.ground_truth
    )
    const autoAnnotations = currentImage.annotations.filter(
      (a: Annotation) => a.type === AnnotationType.auto
    )

    // Various cases based on annotation types
    if (currentImage.annotations.length === 0) {
      // No annotations case
      const newGT = this.eyepopSST.getGroundTruthDefault(currentImage)
      newGT.user_review = UserReview.approved
      currentImage.annotations.push(newGT)
      await this.eyepopSST.updateAssetAnnotations(uuid, newGT)
    } else if (gtAnnotations.length > 0 && autoAnnotations.length === 0) {
      // Only ground-truth case
      const approvedGT = gtAnnotations[0]
      approvedGT.user_review = UserReview.approved

      for (let i = 1; i < gtAnnotations.length; i++) {
        gtAnnotations[i].user_review = UserReview.rejected
      }

      await this.eyepopSST.updateAssetAnnotations(uuid, approvedGT)
    } else if (autoAnnotations.length > 0 && gtAnnotations.length === 0) {
      // Only auto-annotations case
      await this.eyepopSST.approveAutoAnnotationStatus(uuid)
    } else if (gtAnnotations.length > 0 && autoAnnotations.length > 0) {
      // Both ground-truth and auto-annotations case
      const approvedGT = gtAnnotations[0]
      approvedGT.user_review = UserReview.approved

      for (let i = 1; i < gtAnnotations.length; i++) {
        gtAnnotations[i].user_review = UserReview.rejected
      }

      await this.eyepopSST.rejectAutoAnnotationStatus(uuid)
      await this.eyepopSST.updateAssetAnnotations(uuid, approvedGT)
    }

    this.stateController.updateState({
      mainImage: currentImage,
      assetMap: state.assetMap,
    })
  }

  /**
   * Handle reject image operation
   */
  public async rejectImage(assetUuid?: string): Promise<void> {
    const state = this.stateController.getState()
    const sst = this.eyepopSDK.getSSTController()

    if (!state.images || state.images.length === 0) {
      console.error('No images loaded')
      return
    }

    const currentImage = state.mainImage
    const uuid = assetUuid ?? currentImage?.uuid

    if (!uuid) return

    const asset = state.assetMap[uuid]

    // Mark as rejected
    currentImage.approved = false
    asset.approved = false

    // Handle different annotation scenarios
    const gtAnnotations = currentImage.annotations.filter(
      (a: Annotation) => a.type === AnnotationType.ground_truth
    )
    const autoAnnotations = currentImage.annotations.filter(
      (a: Annotation) => a.type === AnnotationType.auto
    )

    if (currentImage.annotations.length === 0) {
      // Case 1: No annotations
      const newGT = sst.getGroundTruthDefault(currentImage)
      newGT.user_review = UserReview.rejected
      asset.annotations = [newGT]
      currentImage.annotations = [newGT]

      await this.eyepopSST.updateAssetAnnotations(uuid, newGT)
    } else if (gtAnnotations.length > 0 && autoAnnotations.length === 0) {
      // Case 2: Only ground-truth annotations
      gtAnnotations.forEach((gt) => {
        if (gt.user_review !== UserReview.rejected) {
          gt.user_review = UserReview.rejected
        }
      })

      await this.eyepopSST.updateAssetAnnotations(uuid, gtAnnotations[0])
    } else if (autoAnnotations.length > 0 && gtAnnotations.length === 0) {
      // Case 3: Only auto-annotations
      autoAnnotations.forEach((aa) => {
        if (aa.user_review !== UserReview.rejected) {
          aa.user_review = UserReview.rejected
        }
      })

      await this.eyepopSST.rejectAutoAnnotationStatus(uuid, undefined, true)
    } else if (gtAnnotations.length > 0 && autoAnnotations.length > 0) {
      // Case 4: Both ground-truth and auto-annotations
      const isGTApproved = gtAnnotations.some(
        (gt) => gt.user_review === UserReview.approved
      )

      if (isGTApproved) {
        // If GT is approved, only reject GT annotations
        gtAnnotations.forEach((gt) => {
          if (gt.user_review === UserReview.approved) {
            gt.user_review = UserReview.rejected
          }
        })

        await this.eyepopSST.updateAssetAnnotations(uuid, gtAnnotations[0])
      } else {
        // If GT is not approved, reject both GT and auto-annotations
        gtAnnotations.forEach((gt) => {
          if (gt.user_review !== UserReview.rejected) {
            gt.user_review = UserReview.rejected
          }
        })

        autoAnnotations.forEach((aa) => {
          if (aa.user_review !== UserReview.rejected) {
            aa.user_review = UserReview.rejected
          }
        })

        await this.eyepopSST.updateAssetAnnotations(uuid, gtAnnotations[0])
        await this.eyepopSST.rejectAutoAnnotationStatus(uuid, undefined, true)
      }
    }

    this.stateController.updateState({
      mainImage: currentImage,
      assetMap: state.assetMap,
    })
  }

  /**
   * Handle save of object detection annotations
   */
  public async handleSave(
    rects: any[],
    backgroundImage: any,
    onlySaveIfDirty: boolean = false
  ): Promise<void> {
    const state = this.stateController.getState()
    if (!state.mainImage) return

    // Check if we have ground truth rectangles
    const hasGroundTruth = this.eyepopSST.checkRectsHasGroundTruth({
      getObjects: () => rects,
    })

    if (!hasGroundTruth && onlySaveIfDirty) {
      return
    }

    // Get existing ground truth annotation
    const sourceGroundTruth = state.mainImage.annotations.find(
      (annotation: Annotation) =>
        annotation.type === AnnotationType.ground_truth
    )

    // Convert rects to ground truth annotation
    const groundAnnotation = this.eyepopSST.convertRectsToGroundTruth(
      state.mainImage,
      rects,
      backgroundImage
    )

    // Skip if nothing has changed
    if (onlySaveIfDirty && _.isEqual(sourceGroundTruth, groundAnnotation)) {
      return
    }

    // Remove existing ground truth annotations
    state.mainImage.annotations = state.mainImage.annotations.filter(
      (annotation: Annotation) =>
        annotation.type !== AnnotationType.ground_truth
    )

    // Add new ground truth annotation
    state.mainImage.annotations.push(groundAnnotation)

    // Update asset annotations on the server
    this.eyepopSST
      .rejectAutoAnnotationStatus(state.mainImage.uuid)
      .finally(() => {
        const asset = state.assetMap[state.mainImage.uuid]
        state.mainImage.approved = asset.approved =
          groundAnnotation.user_review === UserReview.approved

        this.eyepopSST.updateAssetAnnotations(
          state.mainImage.uuid,
          groundAnnotation
        )
      })

    this.stateController.updateState({
      mainImage: state.mainImage,
    })
  }

  /**
   * Set the confidence threshold for annotations
   */
  public setConfidenceThreshold(threshold: number): void {
    this.eyepopSST.setConfidenceThreshold(threshold)

    this.stateController.updateState({
      confidenceThreshold: threshold,
    })
  }

  /**
   * Get images with pagination
   */
  public async getImages(
    startIndex: number = 0,
    count: number = 16
  ): Promise<any[]> {
    const state = this.stateController.getState()

    if (!state.images || state.images.length === 0) {
      return []
    }

    const endIndex = Math.min(startIndex + count, state.images.length)
    const visibleImages = state.images?.slice(startIndex, endIndex)

    const thumbnails = visibleImages
      .map((imageUuid) => {
        return state.assetMap[imageUuid]
      })
      .filter(Boolean)

    this.stateController.updateState({
      thumbnails,
      startIndex,
    })

    return thumbnails
  }

  /**
   * Navigate to the next image
   */
  public async nextImage(skipToUnapproved: boolean = false): Promise<void> {
    const state = this.stateController.getState()

    if (!state.images || state.images.length === 0) {
      console.error('No images loaded')
      return
    }

    if (state.currentImageIndex >= state.images.length - 1) {
      console.log('Already at the last image')
      return
    }

    if (skipToUnapproved) {
      await this.skipToNextUnapproved()
    } else {
      this.setCurrentImageIndex(state.currentImageIndex + 1)
    }
  }

  /**
   * Navigate to previous image
   */
  public previousImage(): void {
    const state = this.stateController.getState()
    this.setCurrentImageIndex(state.currentImageIndex - 1)
  }

  /**
   * Set current image index
   */
  public setCurrentImageIndex(index: number): void {
    const state = this.stateController.getState()
    const newIndex = _.clamp(index, 0, state.images?.length - 1 || 0)

    this.stateController.updateState({
      currentImageIndex: newIndex,
      version: state.version + 1,
    })

    this.getImage(newIndex)
  }

  /**
   * Skip to the next unapproved image
   */
  public async skipToNextUnapproved(): Promise<void> {
    const state = this.stateController.getState()
    const assetMap = state.assetMap
    let i = state.currentImageIndex + 1

    for (let j = i; j < state.images.length; j++) {
      const imgUuid = state.images[j]
      if (!imgUuid) continue

      const asset = assetMap[imgUuid]
      if (!asset) {
        await this.getAsset(imgUuid, true)
      }

      const sst = this.eyepopSDK.getSSTController()
      const approved = sst.hasApprovedAnnotation(assetMap[imgUuid])

      if (approved !== true && approved !== false) {
        this.setCurrentImageIndex(j)
        return
      }
    }
  }

  /**
   * Get a specific asset
   */
  public async getAsset(
    assetUUID: string,
    includeAnnotations: boolean = true
  ): Promise<Asset | null> {
    try {
      const state = this.stateController.getState()

      const asset = await this.eyepopSDK.getAsset(
        assetUUID,
        state.datasetUUID,
        state.datasetVersion,
        includeAnnotations
      )

      if (asset) {
        const sst = this.eyepopSDK.getSSTController()
        sst.addToAssetMap(asset)

        this.stateController.updateState({
          assetMap: sst.getAssetMap(),
          lastAnnotatedAsset: asset,
        })

        return asset
      }

      return null
    } catch (error) {
      console.error('Failed to get asset:', error)
      return null
    }
  }

  /**
   * Get image by index
   */
  public async getImage(index: number = -1): Promise<any> {
    const state = this.stateController.getState()

    if (index === -1) {
      index = state.currentImageIndex
    }

    if (!state.images || !state.images[index]) {
      return null
    }

    const assetMap = state.assetMap

    if (!(state.images[index] in assetMap)) {
      return null
    }

    const image = assetMap[state.images[index]]

    if (!image.annotations) {
      await this.getAsset(image.uuid, true)
      const updatedState = this.stateController.getState()
      const updatedImage = updatedState.assetMap[state.images[index]]

      this.stateController.updateState({
        mainImage: updatedImage,
      })

      return updatedImage
    }

    this.stateController.updateState({
      mainImage: image,
    })

    return image
  }

  // File Upload Methods
  public async uploadFiles(files: File[]): Promise<Asset[]> {
    try {
      const assets = await this.assetCacheController.uploadFiles(files)
      this.update()
      return assets
    } catch (error) {
      console.error('SSTManager: Error uploading files', error)
      this.setError(error instanceof Error ? error.message : String(error))
    }
  }

  // Error Handling
  public setError(error: string | null): void {
    this.stateController.setError(error)
    this.update()
  }

  // Cleanup
  public cleanup(): void {
    this.stateController.setState({
      initialized: false,
    })
    this.eyepopSDK?.cleanup()
    this.assetCacheController?.cleanup()
  }

  // Getters for individual controllers
  public getNavigationController(): SSTNavigationController {
    return this.navigationController
  }

  public getEyePopSDK(): EyePopSDK {
    return this.eyepopSDK
  }

  public getDataController(): AssetCacheController {
    return this.assetCacheController
  }

  public getStateController(): ReportStateController<SSTState> {
    return this.stateController
  }

  public retry(): void {
    this.cleanup()
    this.initialize(
      this.stateController.getState as unknown as () => SSTState,
      this.stateController.setState
    )
  }
}
