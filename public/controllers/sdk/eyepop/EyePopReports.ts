import {
  Dataset,
  DatasetUpdate,
  ModelStatus,
  TranscodeMode,
  DataEndpoint,
  WorkflowPhase,
  CreateWorkflow,
  Workflow,
  ListWorkFlowItem,
  Annotation,
  UserReview,
  AnnotationType,
} from '@eyepop.ai/eyepop'
import { EyePopSDK } from '../EyePopSDK'
import { ReportManager } from '../../report/ReportManager'

export type ReportStatsMap = Map<
  string,
  { count: number; category: string; classLabel: string }
>
export interface ReportStats {
  assetTypeCounts: ReportStatsMap
  simplifiedTypeCounts: Map<string, number>
  dataset: Dataset
  heroImage: string
  totalImageCount: number
  timeToRunMinutes: number
}

export type ReportDatasetCard = Dataset & { heroImage: string }
export type ReportWorkflowCard = ListWorkFlowItem & ReportDatasetCard

export class EyePopReports {
  private eyepopSDK: EyePopSDK

  constructor(eyepopSDK: EyePopSDK) {
    this.eyepopSDK = eyepopSDK
  }

  public async startWorkflow(
    accountUUID: string = this.eyepopSDK.getAccountUUID(),
    reportName: string = 'image-contents-latest',
    workflow: CreateWorkflow | null = null
  ): Promise<any> {
    if (!workflow) {
      const state = ReportManager.instance?.getStateController().getState()

      const dataset = await this.getReportDataset(
        this.eyepopSDK.getDatasetUUID()
      )
      const templateString = dataset.auto_annotate_params?.prompts?.[0]?.prompt

      const createWorkflow = {
        parameters: {
          dataset_uuid: this.eyepopSDK.getDatasetUUID(),
          dataset_version: this.eyepopSDK.getDatasetVersion(),
          model_uuid: undefined,
          config: {
            evaluator: {
              model: {
                prompt: templateString,
              },
            },
            llm_evaluator: {
              model: {
                prompt: templateString,
              },
            },
          },
        },
      } as unknown as CreateWorkflow

      console.log('🍟EyePopReports.ts:95/(createWorkflow):', createWorkflow)

      return await this.eyepopSDK.endpoint?.startWorkflow(
        accountUUID,
        reportName,
        createWorkflow
      )
    }
  }
  public async listWorkflows(
    running?: boolean,
    datasetUUIDs?: string[]
  ): Promise<ReportWorkflowCard[]> {
    // get only running or pending workflows
    const workflows = await this.eyepopSDK.endpoint?.listWorkflows(
      this.eyepopSDK.getAccountUUID(),
      datasetUUIDs || [this.eyepopSDK.getDatasetUUID()],
      undefined,
      running ? [WorkflowPhase.running, WorkflowPhase.pending] : undefined
    )

    const datasets = await this.listAll()

    return workflows?.map((workflow) => {
      const dataset = datasets.find(
        (dataset) => dataset.uuid === workflow.metadata.labels.dataset_uuid
      )
      return {
        ...dataset,
        ...workflow,
      }
    })
  }

  public async getWorkflow(workflowId: string): Promise<ListWorkFlowItem> {
    const workflow = await this.eyepopSDK.endpoint?.getWorkflow(
      workflowId,
      this.eyepopSDK.getAccountUUID()
    )
    return workflow
  }

  public async getWorkflowByDatasetUUID(
    datasetUUID: string,
    phase: WorkflowPhase[] = [WorkflowPhase.running, WorkflowPhase.pending]
  ): Promise<ListWorkFlowItem> {
    const workflows = await this.listWorkflows()
    return workflows.find(
      (workflow) =>
        phase.includes(workflow.metadata.labels.phase) &&
        workflow.metadata.labels.dataset_uuid === datasetUUID
    )
  }
  public async listAll(useCache: boolean = true): Promise<ReportDatasetCard[]> {
    try {
      const state = ReportManager.instance?.getStateController().getState()
      let datasets = state.datasets

      if (!useCache || !datasets?.length || datasets?.length === 0) {
        datasets = (await this.eyepopSDK.listDatasets(
          true,
          true
        )) as ReportDatasetCard[]
      }

      const reportDatasets = datasets.filter((dataset) =>
        dataset.tags?.includes('report_pop')
      )

      const processedDatasets = await Promise.all(
        reportDatasets.map(async (dataset) => {
          const heroAssetUuid = dataset.versions.find(
            (v) => v.modifiable
          )?.hero_asset_uuid

          if (!heroAssetUuid) {
            return {
              ...dataset,
              heroImage: '/static/dataset_default_placeholder.webp',
            }
          }

          const blob = await this.eyepopSDK.downloadAssetBlob(
            heroAssetUuid,
            dataset.uuid,
            dataset.modifiable_version,
            TranscodeMode.image_cover_224
          )

          return {
            ...dataset,
            heroImage: URL.createObjectURL(blob),
          }
        })
      )

      state.datasets = processedDatasets
      return processedDatasets
    } catch (error) {
      console.error('EyePopReports: Failed to get reports', error)
      throw error
    }
  }

  public async getReportDataset(
    datasetUUID: string = this.eyepopSDK.getDatasetUUID(),
    useCache: boolean = false
  ): Promise<Dataset> {
    const datasets = await this.listAll(useCache)
    const report = datasets.find((dataset) => dataset.uuid === datasetUUID)
    if (!report) {
      throw new Error('Report not found')
    }
    return report
  }

  public async downloadCSV(
    reportName: string,
    datasetUUID: string = this.eyepopSDK.getDatasetUUID()
  ): Promise<string> {
    const assets = await this.eyepopSDK.listAssets(datasetUUID)

    console.log('🍙EyePopReports.ts:184/(assets):', assets)

    const serialized = assets.map((asset) => {
      const annotations = asset.annotations?.[0]?.annotation?.classes
        ?.map((cls) => `"${cls.classLabel}"`)
        .filter((label) => label) // Filter out empty labels
        .join(',')

      return `${asset.uuid},"${asset.external_id}",${annotations}`
    })

    const state = ReportManager.instance?.getStateController().getState()
    const csvHeader =
      'uuid,external_id,' +
      state.fields.properties
        .map((property) => `"${property.name}"`)
        .join(',') +
      '\n'
    const csvContent = csvHeader + serialized.join('\n')

    console.log('🍉EyePopReports.ts:194/(serialized):', serialized)

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    // Create a download link and trigger the download
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${reportName || 'report'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up the object URL
    URL.revokeObjectURL(url)

    return url
  }

  public async getReportStats(
    datasetUUID: string,
    storeInCache: boolean = true
  ): Promise<ReportStats> {
    const report = await this.getReportDataset(datasetUUID)
    const assets = await this.eyepopSDK.listAssets(datasetUUID)
    const assetTypeCounts = new Map<
      string,
      { count: number; category: string; classLabel: string }
    >()
    const simplifiedTypeCounts = new Map<string, number>()

    console.log('🍟EyePopReports.ts:206/(assets):', assets)

    for (const asset of assets) {
      const annotations = asset.annotations

      const newGroundTruth: Annotation = {
        annotation: {
          classes: [],
          source_height: 1,
          source_width: 1,
        },
        user_review: UserReview.approved,
        type: AnnotationType.ground_truth,
      }

      if (annotations?.length > 0) {
        const firstAnnotation = annotations[0]?.annotation

        // if there is no ground truth, create one then add the key as a classLabel to it if
        //  it is not already there
        const currentAssetKeys = new Set<string>()

        firstAnnotation?.classes?.forEach((item) => {
          const category = item?.category || 'null'
          const classLabel = item?.classLabel || 'null'
          const key = `${category}:::::::${classLabel}` //TODO: store this as an object instead of a string
          if (classLabel !== 'null') {
            simplifiedTypeCounts.set(
              category,
              (simplifiedTypeCounts.get(category) || 0) + 1
            )

            currentAssetKeys.add(key)

            assetTypeCounts.set(key, {
              count: (assetTypeCounts.get(key)?.count || 0) + 1,
              category,
              classLabel,
            })
          }
        })

        if (currentAssetKeys.size > 0) {
          newGroundTruth.annotation.classes = Array.from(currentAssetKeys).map(
            (key) => {
              const splitKeys = key?.split(':::::::')
              const category = splitKeys?.[0] || 'null'
              const classLabel = `${category}: ${splitKeys?.[1] || 'null'}`
              return {
                category,
                classLabel,
                id: 0,
                confidence: 1,
              }
            }
          )
        }
      }

      if (newGroundTruth.annotation.classes.length > 0) {
        annotations.push(newGroundTruth)
      }
    }

    if (storeInCache) {
      const state = ReportManager.instance?.getStateController().getState()
      state.assets.assets = assets
      ReportManager.instance?.getStateController().setState(state)
    }

    let heroImage = report.versions.find(
      (version) => version.version === report.modifiable_version
    )?.hero_asset_uuid

    if (heroImage) {
      heroImage = URL.createObjectURL(
        await this.eyepopSDK.downloadAssetBlob(
          heroImage,
          report.uuid,
          report.modifiable_version,
          TranscodeMode.image_cover_640
        )
      )
    }

    // Calculate total image count and processing time in minutes
    const totalImageCount = assets.length
    const timeToRunMinutes = (15 * totalImageCount) / 60

    return {
      assetTypeCounts,
      simplifiedTypeCounts,
      dataset: report,
      heroImage,
      totalImageCount,
      timeToRunMinutes,
    }
  }

  public async getRunningAndActiveReports(): Promise<{
    processingReports: ReportWorkflowCard[]
    completedReports: ReportDatasetCard[]
    draftReports: ReportDatasetCard[]
  }> {
    const reports = await this.listAll(false)
    const datasetUUIDs = reports.map((report) => report.uuid)
    let processingReports = await this.listWorkflows(true, datasetUUIDs)

    processingReports = processingReports.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    const draftReports = reports
      .filter((report) => {
        const modifiableVersion = report.versions.find((v) => v.modifiable)
        return (
          (!modifiableVersion?.asset_stats ||
            modifiableVersion.asset_stats.auto_annotated === 0) &&
          !processingReports.find((r) => r.uuid === report.uuid)
        )
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

    // filter out reports that are not running or pending
    const completedReports = reports
      .filter(
        (report) =>
          !processingReports.find((r) => r.uuid === report.uuid) &&
          !draftReports.find((r) => r.uuid === report.uuid)
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

    return { processingReports, completedReports, draftReports }
  }
}
