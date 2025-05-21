import React, { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { useFeatureSlice } from '../../src';

const UserProfile: React.FC = () => {
  const userSlice = useFeatureSlice(useAppStore, 'user');
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    // Wait for the store (and its async features) to be initialized
    useAppStore.onInitialized.then(() => {
      setStoreReady(true);
      console.log("Store fully initialized, including async features.");
    });
  }, []);

  if (!storeReady || userSlice.isLoading) {
    return <p>Loading user profile (store ready: {String(storeReady)}, feature loading: {String(userSlice.isLoading)})...</p>;
  }

  if (userSlice.error) {
    return <p style={{ color: 'red' }}>Error loading user: {userSlice.error}</p>;
  }

  if (!userSlice.userData) {
    return <p>No user data found after loading.</p>;
  }

  return (
    <div>
      <h2>User Profile (Async Init)</h2>
      <p>ID: {userSlice.userData.id}</p>
      <p>Name: {userSlice.userData.name}</p>
      <p>Email: {userSlice.userData.email}</p>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div>
      <h1>Async Initialization Example</h1>
      <UserProfile />
    </div>
  );
};

export default App; 
