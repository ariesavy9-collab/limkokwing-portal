import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../models/firebase';
import { subscribeToAdminAccess } from '../models/authRepository';
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
    let unsubscribeAdminAccess = () => {};

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
      unsubscribeAdminAccess();
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
          loading: true,
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
            authError: error.message || 'Your profile could not be loaded. Check your connection and try again.',
          }));
        },
      );

      unsubscribeAdminAccess = subscribeToAdminAccess(
        user.email,
        (isAdmin, fromCache) => {
          if (!active || auth.currentUser?.uid !== user.uid) return;
          setState((current) => ({
            ...current,
            isAdmin,
            loading: fromCache && onlineRef.current,
          }));
        },
        (error) => {
          if (!active || auth.currentUser?.uid !== user.uid) return;
          setState((current) => ({
            ...current,
            isAdmin: false,
            loading: false,
            authError: error.message || 'Your account permissions could not be loaded.',
          }));
        },
      );
    });

    return () => {
      active = false;
      unsubscribeProfile();
      unsubscribeAdminAccess();
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { ...state, isOnline };
}
