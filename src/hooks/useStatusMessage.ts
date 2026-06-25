import { useEffect, useState } from 'react';

export function useStatusMessage() {
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function clearStatus() {
    setNotice('');
    setError('');
  }

  useEffect(() => {
    if (!notice && !error) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearStatus();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notice, error]);

  return {
    notice,
    error,
    setNotice,
    setError,
    clearStatus,
  };
}
