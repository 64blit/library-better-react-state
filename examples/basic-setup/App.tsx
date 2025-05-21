import React from 'react';
import { useAppStore } from './store';
import { useFeatureSlice } from '../../src'; // Adjust path

const CounterDisplay: React.FC = () => {
  const counterSlice = useFeatureSlice(useAppStore, 'counter');

  return (
    <div>
      <h2>Counter Feature</h2>
      <p>Count: {counterSlice.count}</p>
      <p>Last Updated: {counterSlice.lastUpdated || 'N/A'}</p>
      <button onClick={counterSlice.increment}>Increment</button>
      <button onClick={counterSlice.decrement}>Decrement</button>
      <button onClick={counterSlice.reset}>Reset</button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div>
      <h1>Library Basic Setup Example</h1>
      <CounterDisplay />
    </div>
  );
};

export default App; 
