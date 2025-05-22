import {
  Dataset,
  DatasetCreate,
  DatasetUpdate,
  Asset,
  ChangeEvent,
  EndpointState,
  AnnotationType,
  UserReview,
  Annotation,
  Prediction,
  PredictedClass,
  DatasetVersionAssetStats,
  TranscodeMode,
  ModelUpdate,
  ModelCreate,
  Model,
  ModelTask,
} from '@eyepop.ai/eyepop'
import { EyePopSDK } from '../EyePopSDK'
import _ from 'lodash'
import { DatasetVersion } from '@eyepop.ai/eyepop'

export class EyePopSST {
  private eyepop: EyePopSDK
  private assetMap: Record<string, any> = {}
  private confidenceThreshold: number = 0.5

  constructor(eyepop: EyePopSDK) {
    this.eyepop = eyepop
  }

  /**
   * Get default annotations from an array of annotations
   */
  public getDefaultAnnotations(annotations: Annotation[]): {
    startAnnotations: Annotation | null
    annotationType: AnnotationType
    annotationIndex?: number
  } {
    if (!annotations || annotations.length === 0)
      return {
        startAnnotations: null,
        annotationType: AnnotationType.ground_truth,
        annotationIndex: -1,
      }

    // Start with ground truth annotations
    let annotationType = AnnotationType.ground_truth
    let startAnnotations = annotations?.find(
      (annotation: Annotation) =>
        annotation.type === AnnotationType.ground_truth
    )

    // Next we grab an approved auto annotation if that exists
    if (!startAnnotations) {
      annotationType = AnnotationType.auto
      startAnnotations = annotations.find(
        (annotation: Annotation) =>
          annotation.type === AnnotationType.auto &&
          annotation.user_review === UserReview.approved
      )
    }

    // Next grab the Custom Model auto annotations
    if (!startAnnotations) {
      annotationType = AnnotationType.auto
      startAnnotations = annotations.find((annotation: Annotation) => {
        return (
          annotation.type === AnnotationType.auto &&
          // @ts-ignore
          annotation?.source_model_uuid !== undefined &&
          // @ts-ignore
          annotation?.source_model_uuid !== null
        )
      })
    }

    // And lastly, grab any auto annotations that are left
    if (!startAnnotations) {
      annotationType = AnnotationType.auto
      startAnnotations = annotations.find(
        (annotation: Annotation) => annotation.type === AnnotationType.auto
      )
    }

    const annotationIndex =
      annotations.findIndex(
        (annotation: Annotation) => annotation === startAnnotations
      ) ?? -1

    return { startAnnotations, annotationType, annotationIndex }
  }

  /**
   * Convert rectangles to ground truth annotation
   */
  public convertRectsToGroundTruth(
    imageObject: any,
    rects: any,
    image: any
  ): Annotation {
    if (!image || !imageObject) return {} as Annotation

    if (
      (!rects || rects.length === 0) &&
      imageObject?.annotations?.length === 1 &&
      imageObject?.annotations[0]?.type === AnnotationType.ground_truth
    ) {
      return this.getGroundTruthDefault(imageObject)
    }

    // use existing ground_truth annotation, or create one if it doesn't exist
    const groundTruthAnnotation = imageObject.annotations.find(
      (annotation: Annotation) =>
        annotation.type === AnnotationType.ground_truth
    )
    let groundAnnotation = groundTruthAnnotation

    if (!groundAnnotation) {
      groundAnnotation = {
        type: AnnotationType.ground_truth,
        annotation: {
          objects: [],
          source_width: image.width ?? 1,
          source_height: image.height ?? 1,
        },
      }
      imageObject.annotations.push(groundAnnotation)
    }

    groundAnnotation.user_review = UserReview.approved
    groundAnnotation.annotation.system_timestamp = Date.now()
    groundAnnotation.annotation.objects = []

    for (let i = 0; i < rects.length; i++) {
      // get feature bounds relative to the image top-left corner
      const rectBounds = rects[i]?.getBoundingRect()
      const imageBounds = image?.getBoundingRect()
      const left = rectBounds.left - imageBounds.left
      const top = rectBounds.top - imageBounds.top
      const right = left + rectBounds.width - 2
      const bottom = top + rectBounds.height - 2

      // skip feature if it is outside the image
      if (left >= imageBounds.width) continue
      if (top >= imageBounds.height) continue
      if (right <= 0) continue
      if (bottom <= 0) continue

      // intersect the feature with the image bounds
      const clampedLeft = Math.max(0, left)
      const clampedTop = Math.max(0, top)
      const clampedRight = Math.min(imageBounds.width - 1, right)
      const clampedBottom = Math.min(imageBounds.height - 1, bottom)
      const clampedWidth = clampedRight - clampedLeft
      const clampedHeight = clampedBottom - clampedTop

      // if the feature is too small after clamping to the image, don't add it to the annotation
      if (
        !this.isRectSatisfactory({
          left: clampedLeft,
          top: clampedTop,
          width: clampedWidth,
          height: clampedHeight,
          get: (prop: string) =>
            prop === 'labelType' ? rects[i].get('labelType') : null,
        })
      ) {
        continue
      }

      const confidence = rects[i].get('confidence')

      if (confidence < this.confidenceThreshold) {
        continue
      }

      // converts image coordinates back to annotation coordinates, in case image is a different size
      const annotationScaleX =
        imageBounds.width / groundAnnotation.annotation.source_width
      const annotationScaleY =
        imageBounds.height / groundAnnotation.annotation.source_height

      const x = clampedLeft / annotationScaleX
      const y = clampedTop / annotationScaleY
      const width = Math.round(clampedWidth / annotationScaleX)
      const height = Math.round(clampedHeight / annotationScaleY)

      groundAnnotation.annotation.objects.push({
        x: x.toFixed(2),
        y: y.toFixed(2),
        width: rects[i].get('labelType') == 'pointmode' ? 1 : width.toFixed(2),
        height:
          rects[i].get('labelType') == 'pointmode' ? 1 : height.toFixed(2),
        classLabel: rects[i].get('classLabel'),
        confidence: 1,
        labelType: rects[i].get('labelType'),
      })
    }

    return groundAnnotation
  }

  /**
   * Convert polygons to annotation
   */
  public convertPolygonsToAnnotation(
    canvas: any,
    backgroundImage: any
  ): Annotation | null {
    const image = backgroundImage

    if (!image) return null

    const annotation = {
      source_width: image.get('width'),
      source_height: image.get('height'),
      objects: [] as any[],
    }

    // Iterate over all polygons on the canvas
    canvas.getObjects('polygon').forEach((polygon: any) => {
      const label = polygon.get('classLabel')
      const points: { x: number; y: number }[] = []

      polygon.points?.forEach((pt: any) => {
        const x = Math.max(
          0,
          Math.min(annotation.source_width, (pt.x - image.left) / image.scaleX)
        )
        const y = Math.max(
          0,
          Math.min(annotation.source_height, (pt.y - image.top) / image.scaleY)
        )
        points.push({ x, y })
      })

      if (points.length === 0) return

      const topleft = points.reduce(
        (prev, curr) => ({
          x: Math.min(prev.x, curr.x),
          y: Math.min(prev.y, curr.y),
        }),
        { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
      )

      const bottomright = points.reduce(
        (prev, curr) => ({
          x: Math.max(prev.x, curr.x),
          y: Math.max(prev.y, curr.y),
        }),
        { x: 0, y: 0 }
      )

      annotation.objects.push({
        classLabel: label,
        x: topleft.x,
        y: topleft.y,
        width: bottomright.x - topleft.x,
        height: bottomright.y - topleft.y,
        keyPoints: [
          {
            points: points,
          },
        ],
      })
    })

    return {
      annotation: annotation,
      type: AnnotationType.ground_truth,
      user_review: UserReview.approved,
    } as Annotation
  }

  /**
   * Check if rectangles have ground truth
   */
  public checkRectsHasGroundTruth(canvas: any): boolean {
    let hasGroundTruth = false
    const rects = canvas?.getObjects('rect') ?? []

    if (!rects) return false

    rects.forEach((rect: any) => {
      const annotationType = rect.get('annotationType')

      if (annotationType !== AnnotationType.auto) {
        hasGroundTruth = true
      }
    })

    return hasGroundTruth
  }

  /**
   * Set confidence threshold for filtering annotations
   */
  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold
  }

  /**
   * Get confidence threshold
   */
  public getConfidenceThreshold(): number {
    return this.confidenceThreshold
  }

  /**
   * Check if an asset has approved annotations
   */
  public hasApprovedAnnotation(asset: any): boolean | null {
    if (!asset?.annotations || asset.annotations.length === 0) {
      return null
    }

    // First check for ground truth annotations
    const groundTruth = asset.annotations.find(
      (annotation: Annotation) =>
        annotation.type === AnnotationType.ground_truth
    )
    if (groundTruth) {
      if (groundTruth?.user_review === UserReview.approved) {
        return true
      }
      if (groundTruth?.user_review === UserReview.rejected) {
        return false
      }
    }

    // Then check auto annotations
    const autoAnnotation = asset.annotations.find(
      (annotation: Annotation) => annotation.type === AnnotationType.auto
    )
    if (autoAnnotation) {
      if (autoAnnotation?.user_review === UserReview.approved) {
        return true
      }
      if (autoAnnotation?.user_review === UserReview.rejected) {
        return false
      }
    }

    return null
  }

  /**
   * Create a default ground truth annotation
   */
  public getGroundTruthDefault(imageObject: any): Annotation {
    return {
      type: AnnotationType.ground_truth,
      annotation: {
        objects: [],
        classes: [],
        source_width: imageObject.width ?? 1,
        source_height: imageObject.height ?? 1,
        user_review:
          imageObject.approved == null
            ? UserReview.unknown
            : imageObject.approved
              ? UserReview.approved
              : UserReview.rejected,
      },
      user_review:
        imageObject.approved == null
          ? UserReview.unknown
          : imageObject.approved
            ? UserReview.approved
            : UserReview.rejected,
    } as Annotation
  }

  /**
   * Create activated predicted classes based on label data
   */
  public createActivePredictedClasses(activeLabelData: any): PredictedClass[] {
    return Object.values(activeLabelData)
      .filter((label: any) => label.active)
      .map((label: any) => ({
        id: Number((Math.random() * 1000).toFixed(0)),
        confidence: 1.0,
        classLabel: label.classLabel,
        category: 'object',
      }))
  }

  /**
   * Check if a rectangle satisfies minimum size criteria
   */
  public isRectSatisfactory(rect: any): boolean {
    if (!rect) return false
    if ((rect.get && (rect.get('labelType') as string)) == 'pointmode') {
      return true
    }

    const width = rect.width || 0
    const height = rect.height || 0

    return width >= 4 && height >= 4
  }

  /**
   * Add asset to asset map
   */
  public addToAssetMap(
    asset: any,
    FAKE_PRIORITY: number = 100.00034159469604
  ): void {
    if (!asset?.uuid) return

    // Check if the cached asset was manually set to a 100 priority
    if (
      this.assetMap[asset.uuid]?.review_priority == FAKE_PRIORITY &&
      asset?.review_priority <= 1
    ) {
      asset.review_priority = asset?.review_priority + FAKE_PRIORITY + 0.001
    }

    this.assetMap[asset.uuid] = asset
    this.assetMap[asset.uuid].approved = this.hasApprovedAnnotation(asset)
  }

  /**
   * Get asset map
   */
  public getAssetMap(): Record<string, any> {
    return this.assetMap
  }

  /**
   * Sort images by review priority
   */
  public sortByReviewPriority(images: string[]): string[] {
    return images.sort((a: any, b: any) => {
      const assetA = this.assetMap[a]
      const assetB = this.assetMap[b]

      const assetAreview = assetA?.review_priority ?? 0
      const assetBreview = assetB?.review_priority ?? 0

      return assetBreview - assetAreview
    })
  }

  /**
   * Calculate auto-labeling progress based on dataset stats
   */
  public calculateProgress(
    datasetStats: DatasetVersionAssetStats & {
      analyzedCount: number
      runTotal: number
    },
    startingCount: number,
    maxAutoAnnotate: number = 50
  ): {
    progress: number
    analyzedPercent: number
  } {
    if (!datasetStats) {
      return { progress: 0, analyzedPercent: 0 }
    }

    const analyzedCount = datasetStats.analyzedCount ?? 0
    const totalImages = Math.max(
      Math.min(Object.keys(this.assetMap).length, maxAutoAnnotate),
      maxAutoAnnotate
    )

    let analyzedPercent =
      totalImages > 0 ? parseFloat((analyzedCount / totalImages).toFixed(2)) : 0
    if (isNaN(analyzedPercent)) {
      analyzedPercent = 0
    }

    const rejected = datasetStats.rejected ?? 0
    const autoAnnotated = (datasetStats.auto_annotated ?? 0) + rejected

    // Use starting count to calculate total number of images
    const annotatedCount = Math.abs(autoAnnotated - startingCount)

    let progress = _.clamp(
      parseFloat(
        (annotatedCount / Math.max(datasetStats.runTotal || 1, 1)).toFixed(2)
      ),
      0,
      1
    )

    if (isNaN(progress)) progress = 0

    progress = Math.min(Math.max(progress, 0), 1)
    analyzedPercent = Math.min(Math.max(analyzedPercent, 0), 1)

    return { progress, analyzedPercent }
  }

  /**
   * Create a model based on the dataset
   * @param datasetUUID Dataset UUID
   * @param datasetVersion Dataset version
   * @param modelData Model creation data
   * @param startTraining Whether to start training immediately
   * @returns Created model
   */
  public async startTraining(
    modelCreateData: ModelCreate,
    datasetUUID: string = this.eyepop.getDatasetUUID(),
    datasetVersion: number = this.eyepop.getDatasetVersion(),
    startTraining: boolean = true
  ): Promise<Model> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      // Create the model via SDK
      const model = await this.eyepop.createModel(
        modelCreateData,
        datasetUUID,
        datasetVersion,
        startTraining
      )
      return model
    } catch (error) {
      console.error('Failed to create model:', error)
      throw error
    }
  }

  /**
   * List all models
   * @returns List of models
   */
  public async listModels(): Promise<Model[]> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      const models = await this.eyepop.listModels()
      return models
    } catch (error) {
      console.error('Failed to list models:', error)
      throw error
    }
  }

  /**
   * Get a model by UUID
   * @param modelUUID Model UUID
   * @returns Model details
   */
  public async getModel(modelUUID: string): Promise<Model> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      const model = await this.eyepop.getModel(modelUUID)
      return model
    } catch (error) {
      console.error('Failed to get model:', error)
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
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      const model = await this.eyepop.updateModel(modelUUID, modelData)
      return model
    } catch (error) {
      console.error('Failed to update model:', error)
      throw error
    }
  }

  /**
   * Delete a model
   * @param modelUUID Model UUID
   * @returns Success status
   */
  public async deleteModel(modelUUID: string): Promise<any> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      return await this.eyepop.deleteModel(modelUUID)
    } catch (error) {
      console.error('Failed to delete model:', error)
      throw error
    }
  }

  /**
   * Publish a model
   * @param modelUUID Model UUID
   * @returns Published model
   */
  public async publishModel(modelUUID: string): Promise<Model> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      const model = await this.eyepop.publishModel(modelUUID)
      return model
    } catch (error) {
      console.error('Failed to publish model:', error)
      throw error
    }
  }

  /**
   * Get model training progress
   * @param modelUUID Model UUID
   * @returns Training progress information
   */
  public async getModelTrainingProgress(modelUUID: string): Promise<any> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      const progress = await this.eyepop.getModelTrainingProgress(modelUUID)
      return progress
    } catch (error) {
      console.error('Failed to get model training progress:', error)
      throw error
    }
  }

  /**
   * Update asset annotations
   * @param assetUUID Asset UUID
   * @param annotation Annotation to update
   * @returns Updated asset
   */
  public async updateAssetAnnotations(
    assetUUID: string,
    annotation: Annotation
  ): Promise<any> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      const datasetUUID = await this.getAssetDatasetUUID(assetUUID)
      const datasetVersion = await this.getAssetDatasetVersion(assetUUID)

      const result = await this.eyepop.updateAssetGroundTruth(
        assetUUID,
        datasetUUID,
        datasetVersion,
        annotation.annotation
      )

      // Update asset in asset map
      if (assetUUID in this.assetMap) {
        // Find and replace the ground truth annotation, or add a new one
        const asset = this.assetMap[assetUUID]
        const gtIndex = asset.annotations.findIndex(
          (a: Annotation) => a.type === AnnotationType.ground_truth
        )

        if (gtIndex >= 0) {
          asset.annotations[gtIndex] = annotation
        } else {
          asset.annotations.push(annotation)
        }

        asset.approved = annotation.user_review === UserReview.approved
        this.assetMap[assetUUID] = asset
      }

      return result
    } catch (error) {
      console.error('Failed to update asset annotations:', error)
      throw error
    }
  }

  /**
   * Approve auto annotation status
   * @param assetUUID Asset UUID
   * @param auto_annotate Auto annotate type
   * @returns Updated asset
   */
  public async approveAutoAnnotationStatus(
    assetUUID: string,
    auto_annotate?: string
  ): Promise<any> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    try {
      const asset = this.assetMap[assetUUID]
      if (!asset) {
        throw new Error(`Asset ${assetUUID} not found in asset map`)
      }

      // Determine which auto annotate type to use
      const annotateType =
        auto_annotate ||
        asset.annotations.find(
          (a: Annotation) => a.type === AnnotationType.auto
        )?.auto_annotate ||
        'grounding_dino_base'

      const result = await this.eyepop.updateAutoAnnotationStatus(
        assetUUID,
        annotateType,
        UserReview.approved,
        this.confidenceThreshold
      )

      // Update asset in asset map
      if (assetUUID in this.assetMap) {
        const asset = this.assetMap[assetUUID]
        asset.annotations.forEach((a: Annotation) => {
          if (
            a.type === AnnotationType.auto &&
            a.auto_annotate === annotateType
          ) {
            a.user_review = UserReview.approved
            a.approved_threshold = this.confidenceThreshold
          } else if (a.type === AnnotationType.auto) {
            a.user_review = UserReview.rejected
          }
        })

        asset.approved = true
        this.assetMap[assetUUID] = asset
      }

      return result
    } catch (error) {
      console.error('Failed to approve auto annotation status:', error)
      throw error
    }
  }

  /**
   * Reject auto annotation status
   * @param assetUUID Asset UUID
   * @param auto_annotate Auto annotate type
   * @param force Force reject all auto annotations
   * @returns Updated asset
   */
  public async rejectAutoAnnotationStatus(
    assetUUID: string,
    auto_annotate?: string,
    force: boolean = false
  ): Promise<any> {
    if (!this.eyepop) {
      throw new Error('EyePopSDK not initialized')
    }

    const asset = this.assetMap[assetUUID]
    if (!asset) {
      throw new Error(`Asset ${assetUUID} not found in asset map`)
    }

    const allPromises = []

    try {
      // If asset has no annotations and force is true, create a rejected ground truth
      if (asset.annotations.length === 0 && force) {
        const defaultEmptyGroundTruth: Prediction = {
          source_width: asset?.source_width ?? 1,
          source_height: asset?.source_height ?? 1,
          objects: [],
        }

        const rejectedAnnotation: Annotation = {
          type: AnnotationType.ground_truth,
          user_review: UserReview.rejected,
          annotation: defaultEmptyGroundTruth,
        }

        asset.annotations.push(rejectedAnnotation)
        asset.approved = false

        allPromises.push(
          this.updateAssetAnnotations(assetUUID, rejectedAnnotation)
        )
      }

      // Mark all auto annotations as rejected
      asset.annotations.forEach((element: Annotation) => {
        if (element.type === AnnotationType.auto) {
          element.user_review = UserReview.rejected

          // Force reject all auto annotations if requested
          if (force && element.auto_annotate) {
            allPromises.push(
              this.eyepop.updateAutoAnnotationStatus(
                assetUUID,
                element.auto_annotate,
                UserReview.rejected
              )
            )
          }
        }
      })

      // If not forcing all rejects, only reject the specific auto annotation
      if (
        allPromises.length === 0 &&
        asset.annotations.some(
          (element: Annotation) => element.type === AnnotationType.auto
        )
      ) {
        const annotateType =
          auto_annotate ||
          asset.annotations.find(
            (a: Annotation) => a.type === AnnotationType.auto
          )?.auto_annotate ||
          'grounding_dino_base'

        allPromises.push(
          this.eyepop.updateAutoAnnotationStatus(
            assetUUID,
            annotateType,
            UserReview.rejected
          )
        )
      }

      // Update asset in asset map
      asset.approved = false
      this.assetMap[assetUUID] = asset

      return await Promise.all(allPromises)
    } catch (error) {
      console.error('Failed to reject auto annotation status:', error)
      throw error
    }
  }

  /**
   * Helper method to get dataset UUID for an asset
   * @param assetUUID Asset UUID
   * @returns Dataset UUID
   */
  private async getAssetDatasetUUID(assetUUID: string): Promise<string> {
    const asset = this.assetMap[assetUUID] as any
    if (asset && asset.dataset_uuid) {
      return asset.dataset_uuid
    }

    // If not in asset map, try to get from SDK
    const retrievedAsset = (await this.eyepop.getAsset(assetUUID)) as any
    if (retrievedAsset && retrievedAsset.dataset_uuid) {
      return retrievedAsset.dataset_uuid
    }

    throw new Error(`Could not determine dataset UUID for asset ${assetUUID}`)
  }

  /**
   * Helper method to get dataset version for an asset
   * @param assetUUID Asset UUID
   * @returns Dataset version
   */
  private async getAssetDatasetVersion(assetUUID: string): Promise<number> {
    const asset = this.assetMap[assetUUID] as any
    if (asset && asset.dataset_version) {
      return asset.dataset_version
    }

    // If not in asset map, try to get from SDK
    const retrievedAsset = (await this.eyepop.getAsset(assetUUID)) as any
    if (retrievedAsset && retrievedAsset.dataset_version) {
      return retrievedAsset.dataset_version
    }

    throw new Error(
      `Could not determine dataset version for asset ${assetUUID}`
    )
  }
}
