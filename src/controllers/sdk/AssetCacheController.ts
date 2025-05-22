import {
  AssetManagerState,
  ReportAsset,
  UploadProgress,
  ProcessingProgress,
  DatasetConfig,
} from './types'
import { EyePopSDK } from './EyePopSDK'
import { ReportManager } from '@controllers/report/ReportManager'
import { ReportStateController } from '@controllers/report/state/ReportStateController'
import { initReportState } from '@store/ReportStore'
import { Asset } from '@eyepop.ai/eyepop'

// TODO: implement this cache system
export class AssetCacheController {
  private update: () => void
  private cache: Record<string, ReportAsset> = {}
  private epSdk: EyePopSDK

  constructor() {
    this.update = ReportStateController.instance?.update.bind(
      ReportStateController.instance
    )
    this.epSdk = ReportManager.instance?.getEyePopSDK()
  }

  private getState(): AssetManagerState {
    const state = ReportStateController.instance?.getState()

    if (!state) {
      return initReportState.assets
    }
    return state.assets as AssetManagerState
  }

  // Asset management
  public async downloadAsset(assetId: string): Promise<ReportAsset | null> {
    try {
      // Return from cache if available
      if (this.cache[assetId]) {
        return this.cache[assetId]
      }

      const state = this.getState()
      if (!state.dataset.uuid) {
        console.error('DataController: No dataset UUID available')
        return null
      }
      this.epSdk = ReportManager.instance?.getEyePopSDK()

      // Get the asset from the endpoint
      const asset = await this.epSdk.getAsset(
        assetId,
        state.dataset.uuid,
        state.dataset.version,
        true // Include annotations
      )

      if (!asset) {
        console.error(`DataController: Asset ${assetId} not found`)
        return null
      }

      // If the asset has an image, download the blob
      if (asset.uuid) {
        try {
          const blob = await this.epSdk.downloadAssetBlob(
            asset.uuid,
            state.dataset.uuid,
            state.dataset.version
          )

          if (blob) {
            const imageUrl = URL.createObjectURL(blob)
            const reportAsset: ReportAsset = {
              ...asset,
              imageUrl,
            }

            // Store in cache
            this.cache[assetId] = reportAsset
            this.update()

            return reportAsset
          }
        } catch (error) {
          console.error(
            `DataController: Failed to download asset blob for ${assetId}`,
            error
          )
        }
      }

      return null
    } catch (error) {
      console.error(`DataController: Error downloading asset ${assetId}`, error)
      return null
    }
  }

  public async getRandomAsset(): Promise<ReportAsset | null> {
    const state = this.getState()
    const randomUUID =
      state?.assets[Math.floor(Math.random() * state?.assets?.length)]?.uuid

    if (!randomUUID) {
      console.error('DataController: No random asset UUID available')
      return null
    }

    return await this.downloadAsset(randomUUID)
  }

  public async downloadAssetsInBatch(
    assetIds: string[]
  ): Promise<ReportAsset[]> {
    try {
      const promises = assetIds.map((id) => this.downloadAsset(id))
      const assets = await Promise.all(promises)
      return assets.filter((asset): asset is ReportAsset => asset !== null)
    } catch (error) {
      console.error('DataController: Error downloading assets in batch', error)
      return []
    }
  }

  public updateAsset(updatedAsset: ReportAsset): void {
    if (!updatedAsset || !updatedAsset.uuid) {
      console.error('DataController: Invalid asset update received')
      return
    }

    this.cache[updatedAsset.uuid] = {
      ...(this.cache[updatedAsset.uuid] || {}),
      ...updatedAsset,
    }

    this.update()
  }

  public getAsset(assetId: string): ReportAsset | null {
    return this.cache[assetId] || null
  }

  public getAllCachedAssets(): ReportAsset[] {
    return Object.values(this.cache)
  }

  // File upload handling
  public async uploadFiles(files: File[]): Promise<Asset[]> {
    const results: Asset[] = []
    try {
      this.epSdk = ReportManager.instance?.getEyePopSDK()

      const state = this.getState()
      // Reset upload state
      state.upload = {
        uploadProgress: 0,
        uploadTotalFiles: files.length,
        uploadCurrentFileIndex: 0,
      }
      this.update()

      // Create dataset if needed
      if (!state.dataset.uuid) {
        state.dataset.uuid = this.epSdk?.getDatasetUUID()
        state.dataset.version = this.epSdk?.getDatasetVersion()
      }

      const uploadPromises: Promise<Asset>[] = []

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        state.upload.uploadCurrentFileIndex = i + 1

        const uploadPromise = this.epSdk
          ?.uploadAsset(
            state.dataset.uuid,
            state.dataset.version,
            files[i],
            files[i].name
          )
          .then((asset) => {
            // Update progress only after each upload completes
            state.upload.uploadProgress = ((i + 1) / files.length) * 100
            this.update()
            results.push(asset)
            return asset
          })
          .catch((error) => {
            console.error('DataController: Error uploading asset', error)
            throw error
          })

        uploadPromises.push(uploadPromise)
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises)
    } catch (error) {
      throw error
    }
    return results
  }

  public cleanup(): void {
    // Revoke any object URLs to avoid memory leaks
    Object.values(this.cache).forEach((asset) => {
      if (asset.imageUrl && asset.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(asset.imageUrl)
      }
    })
    this.cache = {}
    this.update()
  }
}
