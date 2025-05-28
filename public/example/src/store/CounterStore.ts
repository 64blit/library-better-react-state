import {
  BaseState,
  createStoreSlice
} from 'better-react-state'

import { CounterController } from './CounterController'

export interface CounterState extends BaseState {
  count: number
  loadingCountDown: number
  isLoading: boolean
  status:{},
  error:string|null,
  initialized:boolean,
  version:number
}

export interface CounterControllers {
  counterController: CounterController
}

export const initialCounterState: CounterState = {
  count: 0,
  loadingCountDown: 5,
  isLoading: false,
  status: {},
  error: null,
  initialized: false,
  version: 0
}

export const createCounterSlice = createStoreSlice<
  CounterState,
  CounterControllers
>(
  initialCounterState,
  'counter',
  async (update, getGlobalState, getSliceState, setSliceState) => {
    // Create the controller instance with proper dependency injection
    const counterController = new CounterController(getSliceState, setSliceState)

    while(getSliceState().loadingCountDown > 0){
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSliceState({
        loadingCountDown: getSliceState().loadingCountDown - 1
      })
    }

    return {
      counterController
    }
  }
)
