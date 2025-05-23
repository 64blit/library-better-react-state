import { 
  BaseState, 
  createStoreSlice
} from 'better-react-state'

import { CounterController } from './CounterController'

export interface CounterState extends BaseState {
  count: number
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
  async (_update, _get, getState, setState) => {
    // Create the controller instance with proper dependency injection
    const counterController = new CounterController(getState, setState)

    return {
      counterController
    }
  }
)
