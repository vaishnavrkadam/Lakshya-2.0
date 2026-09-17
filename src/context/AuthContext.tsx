import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  getDocRef,
  getColRef,
  query,
  where,
  onSnapshot
} from '../lib/firebase';
import { normalizeEmail, isAdminEmail } from '../config/lakshya';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    let unsubscribeBookings = null;
    let unsubscribeRegistration = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        const cleanEmail = normalizeEmail(user.email);
        setCurrentUser(user);
        setIsAdmin(isAdminEmail(cleanEmail));

        // Realtime listener for registration status
        const regRef = getDocRef('registrations', cleanEmail);
        unsubscribeRegistration = onSnapshot(regRef, (docSnap) => {
          if (docSnap.exists()) {
            setRegistration({ id: docSnap.id, ...docSnap.data() });
            setOnboardingOpen(false);
          } else {
            setRegistration(null);
            // If logged in but not in registrations, trigger onboarding dialog
            setOnboardingOpen(true);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching registration:", error);
          setLoading(false);
        });

        // Realtime listener for user's bookings
        const bookingsCol = getColRef('bookings');
        const bookingsQuery = query(bookingsCol, where('participantEmail', '==', cleanEmail));
        unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setUserBookings(list);
        }, (error) => {
          console.error("Error fetching user bookings:", error);
        });

      } else {
        setCurrentUser(null);
        setRegistration(null);
        setUserBookings([]);
        setIsAdmin(false);
        setOnboardingOpen(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRegistration) unsubscribeRegistration();
      if (unsubscribeBookings) unsubscribeBookings();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        registration,
        userBookings,
        isAdmin,
        loading,
        onboardingOpen,
        setOnboardingOpen,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
