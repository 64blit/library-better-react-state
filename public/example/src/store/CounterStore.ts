import { 
  BaseState, 
  createStoreSlice
} from 'do-you-zunderstand'

export interface CounterState extends BaseState {
  count: number
  isLoading: boolean
  status:{},
  error:string|null,
  initialized:boolean,
  version:number
}

export interface CounterControllers {
  counterController: {
    increment: () => void
    decrement: () => void
    reset: () => void
    setCount: (count: number) => void
  }
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
  async (update, get, getState, setState) => {
    const counterController = {
      increment: () => {
        const currentState = getState()
        
        setState({
          count: currentState.count + 1
        })
      },
      
      decrement: () => {
        const currentState = getState()
        if (currentState.count > 0) {
          setState({
            count: currentState.count - 1
          })
        }
      },
      
      reset: () => {
        setState({
          count: 0
        })
      },
      
      setCount: (count: number) => {
        setState({
          count
        })
      }
    }

    return {
      counterController
    }
  }
)
