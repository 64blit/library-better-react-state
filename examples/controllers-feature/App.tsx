import React, { useEffect, useState } from 'react';
import { useAppStore, MyAppInitConfig } from './store';
import { useFeatureSlice } from '../../src';

const GreeterComponent: React.FC = () => {
  const greeterSlice = useFeatureSlice(useAppStore, 'greeter');
  const [isLoading, setIsLoading] = useState(false);
  const [initDone, setInitDone] = useState(false);

  const handleGenerateMessage = () => {
    if (greeterSlice.generatePersonalizedMessage) {
      greeterSlice.generatePersonalizedMessage(greeterSlice); // Controller updates state
    }
  };
  
  const handleFetchName = async () => {
    if (greeterSlice.fetchAndSetName) {
        setIsLoading(true);
        try {
            await greeterSlice.fetchAndSetName(greeterSlice); 
        } catch (error) {
            console.error("Error fetching name:", error);
        } finally {
            setIsLoading(false);
        }
    }
  };

  useEffect(() => {
    const initConfig: MyAppInitConfig = {
      apiKey: 'test-api-key-12345',
      apiBaseUrl: 'https://api.example.com/v1',
    };
    useAppStore.init(initConfig).then(INIT => {
      console.log('Global store initialized with:', INIT);
      setInitDone(true);
      // Optionally, call generatePersonalizedMessage on init
      if (greeterSlice.generatePersonalizedMessage) {
        greeterSlice.generatePersonalizedMessage(greeterSlice);
      }
    }).catch(err => {
      console.error("Error during global store init:", err);
      setInitDone(true); // Still allow UI to render, but show potential errors
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  if (!initDone) {
    return <p>Initializing store and controllers...</p>;
  }

  return (
    <div>
      <h2>Greeter Feature (with Controllers)</h2>
      <div>
        Greeting Text:
        <input
          type="text"
          value={greeterSlice.greeting}
          onChange={(e) => greeterSlice.setGreetingText(e.target.value)}
        />
      </div>
      <div>
        Name:
        <input
          type="text"
          value={greeterSlice.nameToGreet}
          onChange={(e) => greeterSlice.setNameToGreet(e.target.value)}
        />
         <button onClick={handleFetchName} disabled={isLoading}>
          {isLoading ? 'Fetching Name...' : 'Fetch Random Name (Controller)'}
        </button>
      </div>
      <button onClick={handleGenerateMessage}>Generate Personalized Message (Controller)</button>
      {greeterSlice.personalizedMessage && (
        <p><strong>Controller Generated:</strong> {greeterSlice.personalizedMessage}</p>
      )}
       <button onClick={greeterSlice.clearPersonalizedMessage} style={{marginLeft: '10px'}}>Clear Message</button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div>
      <h1>Controllers Example</h1>
      <GreeterComponent />
    </div>
  );
};

export default App; 
