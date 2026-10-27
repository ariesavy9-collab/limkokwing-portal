import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../models/firebase';
import { subscribeToStudentProfile } from '../models/portalRepository';

export default function useAuth() {
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === 'undefined' ? true : navigator.onLine
  ));
  const onlineRef = useRef(isOnline);
  const [state, setState] = useState({
    user: null,
    profile: null,
    isAdmin: false,
    loading: true,
    authError: '',
  });

  useEffect(() => {
    let active = true;
    let unsubscribeProfile = () => {};

    const handleOnline = () => {
      onlineRef.current = true;
      setIsOnline(true);
    };
    const handleOffline = () => {
      onlineRef.current = false;
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();
      if (!user) {
        if (active) setState({ user: null, profile: null, isAdmin: false, loading: false, authError: '' });
        return;
      }

      if (active) {
        setState((current) => ({
          ...current,
          user,
          profile: null,
          isAdmin: false,
          loading: false,
          authError: '',
        }));
      }

      unsubscribeProfile = subscribeToStudentProfile(
        user.uid,
        (profile, fromCache) => {
          if (!active) return;
          setState((current) => ({
            ...current,
            user,
            profile,
            loading: false,
            authError: fromCache && !onlineRef.current
              ? 'You are offline. Your profile will sync when your connection returns.'
              : '',
          }));
        },
        (error) => {
          if (!active) return;
          setState((current) => ({
            ...current,
            user,
            loading: false,
            authError: error.message || 'Your profile could not be loaded. Check your connection and try again.',
          }));
        },
      );

      user.getIdTokenResult().then((token) => {
        if (!active || auth.currentUser?.uid !== user.uid) return;
        setState((current) => ({ ...current, isAdmin: token.claims.admin === true }));
      }).catch((error) => {
        if (!active || auth.currentUser?.uid !== user.uid) return;
        setState((current) => ({
          ...current,
          authError: error.message || 'Your account permissions could not be refreshed.',
        }));
      });
    });

    return () => {
      active = false;
      unsubscribeProfile();
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { ...state, isOnline };
}
