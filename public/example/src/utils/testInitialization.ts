/**
 * Test utilities for demonstrating the initialization process
 * 
 * This file contains utilities to test and demonstrate the proper
 * loading sequence of the Better React State library.
 */

export interface InitializationStep {
  name: string
  description: string
  duration: number
  status: 'pending' | 'running' | 'completed' | 'error'
}

export const initializationSteps: InitializationStep[] = [
  {
    name: 'Store Setup',
    description: 'Creating store instance and configuration',
    duration: 100,
    status: 'pending'
  },
  {
    name: 'Counter Slice',
    description: 'Initializing counter slice and controller',
    duration: 150,
    status: 'pending'
  },
  {
    name: 'TaskList Slice', 
    description: 'Initializing task list slice and controller',
    duration: 200,
    status: 'pending'
  },
  {
    name: 'Persistence',
    description: 'Restoring persisted state from localStorage',
    duration: 250,
    status: 'pending'
  },
  {
    name: 'Controllers',
    description: 'Binding controller methods and validating setup',
    duration: 100,
    status: 'pending'
  },
  {
    name: 'Initial Data',
    description: 'Loading sample tasks and setting up demo data',
    duration: 500,
    status: 'pending'
  }
]

/**
 * Simulates the initialization process with proper timing
 */
export const simulateInitialization = async (
  onStepUpdate?: (step: InitializationStep, index: number) => void
): Promise<void> => {
  for (let i = 0; i < initializationSteps.length; i++) {
    const step = initializationSteps[i]
    
    // Mark as running
    step.status = 'running'
    onStepUpdate?.(step, i)
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, step.duration))
    
    // Mark as completed
    step.status = 'completed'
    onStepUpdate?.(step, i)
  }
}

/**
 * Validates that the store is properly initialized
 */
export const validateStoreInitialization = (store: any): boolean => {
  const checks = [
    () => !!store,
    () => store.initialized === true,
    () => !!store.counter,
    () => !!store.counter.state,
    () => !!store.counter.controllers,
    () => !!store.counter.controllers.counterController,
    () => !!store.taskList,
    () => !!store.taskList.state,
    () => !!store.taskList.controllers,
    () => !!store.taskList.controllers.taskController,
    () => store.counter.state.initialized === true,
    () => store.taskList.state.initialized === true
  ]
  
  return checks.every(check => {
    try {
      return check()
    } catch {
      return false
    }
  })
}

/**
 * Gets a human-readable status of the store initialization
 */
export const getStoreStatus = (store: any): string => {
  if (!store) return '❌ Store not found'
  if (!store.initialized) return '⏳ Store initializing...'
  if (!store.counter?.state?.initialized) return '⏳ Counter slice initializing...'
  if (!store.taskList?.state?.initialized) return '⏳ TaskList slice initializing...'
  if (!store.counter?.controllers?.counterController) return '⏳ Counter controller loading...'
  if (!store.taskList?.controllers?.taskController) return '⏳ TaskList controller loading...'
  
  return '✅ Store fully initialized'
}

/**
 * Performance metrics for initialization
 */
export class InitializationMetrics {
  private startTime: number = 0
  private endTime: number = 0
  private steps: Array<{ name: string; startTime: number; endTime: number }> = []
  
  start() {
    this.startTime = performance.now()
  }
  
  stepStart(name: string) {
    this.steps.push({ name, startTime: performance.now(), endTime: 0 })
  }
  
  stepEnd(name: string) {
    const step = this.steps.find(s => s.name === name && s.endTime === 0)
    if (step) {
      step.endTime = performance.now()
    }
  }
  
  end() {
    this.endTime = performance.now()
  }
  
  getReport() {
    const totalTime = this.endTime - this.startTime
    const stepReports = this.steps.map(step => ({
      name: step.name,
      duration: step.endTime - step.startTime,
      percentage: ((step.endTime - step.startTime) / totalTime) * 100
    }))
    
    return {
      totalTime,
      steps: stepReports,
      averageStepTime: stepReports.reduce((sum, step) => sum + step.duration, 0) / stepReports.length
    }
  }
} 
