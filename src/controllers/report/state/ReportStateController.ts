import { ReportState } from './types'
import { SSTState } from '@store/SSTStore'

export type CurrentState = ReportState | SSTState

export class ReportStateController<T extends CurrentState> {
  public static instance: ReportStateController<CurrentState> | null = null
  private getStoreState: () => T
  private setStoreState: (state: Partial<T>) => void
  public update: (key?: string, value?: any) => void

  constructor(
    getStateParam: () => T,
    setStateParam: (state: Partial<T>) => void,
    updateParam: (key?: string, value?: any) => void
  ) {
    this.getStoreState = getStateParam
    this.setStoreState = setStateParam
    this.update = updateParam

    // Only set instance if it doesn't exist yet
    if (!ReportStateController.instance) {
      ReportStateController.instance =
        this as ReportStateController<CurrentState>
    }
  }

  public static getInstance(): ReportStateController<CurrentState> {
    if (!ReportStateController.instance) {
      throw new Error('StateController not initialized')
    }
    return ReportStateController.instance
  }

  public setState = (state: Partial<T>): void => {
    this.setStoreState(state)
    this.update()
  }

  public getState = (): T => {
    return this.getStoreState()
  }

  public updateState = (state: Partial<T>): void => {
    const currentState = this.getState()
    const newState = {
      ...currentState,
      ...state,
    } as T
    this.setState(newState)
  }

  public setError = (error: string | null): void => {
    const currentState = this.getState()
    this.setState({
      ...currentState,
      error,
    })
  }

  public reset = (initialState: {}): void => {
    const currentState = this.getState()
    this.setState({
      ...currentState,
      ...initialState,
    } as T)
  }
}
