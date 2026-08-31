import { useState, useEffect } from 'react';
import { onAuthChange } from '../services/firebase';

/**
 * Custom hook for Firebase auth state management.
 * Returns current user, loading state, and auth status.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
