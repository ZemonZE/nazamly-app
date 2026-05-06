import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, API_URL } from "@/firebase";

const syncUser = async (token: string) => {
  const res = await fetch(`${API_URL}/api/auth/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};

const getProfile = async (token: string) => {
  const res = await fetch(`${API_URL}/api/auth/get-profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};

interface AuthContextType {
  user: User | null;
  backendUser: any | null;
  setBackendUser: React.Dispatch<React.SetStateAction<any | null>>;
  isLoading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  backendUser: null,
  setBackendUser: () => {},
  isLoading: true,
  error: null,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 🌟 Sync-first flow: syncUser → getProfile — يمنع الـ race condition
  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      setError(null);
      const token = await firebaseUser.getIdToken();

      // 1. Sync أولاً — ده بينشئ الـ user لو مش موجود
      try {
        await syncUser(token);
      } catch (syncErr) {
        console.warn("[AuthContext] syncUser warning (non-blocking):", syncErr);
        // non-blocking — getProfile backend يقدر ينشئ الـ user لوحده
      }

      // 2. بعدين نجيب البروفايل
      const response = await getProfile(token);
      if (response.success && response.data) {
        setBackendUser(response.data);
      } else {
        console.warn("[AuthContext] Profile response missing data:", response);
      }
    } catch (err: any) {
      console.error("[AuthContext] Error fetching profile:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // 🌟 دالة لتحديث البروفايل يدوياً
  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, {
      next: async (firebaseUser) => {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          await fetchUserProfile(firebaseUser);
        } else {
          setBackendUser(null);
          setError(null);
        }
        
        setIsLoading(false);
      },
      error: (authError) => {
        setError(authError as Error);
        setIsLoading(false);
      },
      complete: () => {}
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, backendUser, setBackendUser, isLoading, error, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
