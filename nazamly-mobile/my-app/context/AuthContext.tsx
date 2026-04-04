import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, API_URL } from "@/firebase";

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

  // 🌟 دالة لجلب بيانات المستخدم من الباك إند
  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      console.log("[AuthContext] Fetching profile with token:", token ? "✓" : "✗");
      
      const res = await fetch(`${API_URL}/api/auth/get-profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log("[AuthContext] Profile response status:", res.status);
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("[AuthContext] Non-JSON response from:", `${API_URL}/api/auth/get-profile`, "status:", res.status);
        return;
      }
      
      const body = await res.json();
      
      if (res.ok && body.success) {
        console.log("[AuthContext] Profile fetched successfully");
        setBackendUser(body.data);
      } else {
        console.error("[AuthContext] Failed to fetch profile:", body);
      }
    } catch (error) {
      console.error("[AuthContext] Error fetching profile:", error);
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
        
        // 🌟 إذا كان المستخدم مسجل دخول، جلب بياناته من الباك إند
        if (firebaseUser) {
          await fetchUserProfile(firebaseUser);
        } else {
          setBackendUser(null);
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
