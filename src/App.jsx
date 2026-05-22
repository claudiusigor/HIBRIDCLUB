import React, { useEffect } from 'react'
import AuthGate from './components/auth/AuthGate'
import { registerNativeAuthListener } from './services/nativeAuth'

function App() {
  useEffect(() => {
    let removeListener;

    registerNativeAuthListener().then((cleanup) => {
      removeListener = cleanup;
    });

    return () => {
      removeListener?.();
    };
  }, []);

  return (
    <>
      <AuthGate />
    </>
  )
}

export default App
