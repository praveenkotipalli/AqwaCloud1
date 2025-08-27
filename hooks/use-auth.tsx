"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from "firebase/auth"
import { auth } from "@/lib/firebase"

interface User {
  id: string
  email: string
  name: string
  plan: "free" | "pro" | "enterprise"
  usage: {
    transfersThisMonth: number
    storageUsed: number
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Create user object directly from Firebase Auth data
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "",
          plan: "free",
          usage: {
            transfersThisMonth: 0,
            storageUsed: 0
          }
        }
        setUser(userData)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // User will be automatically set via onAuthStateChanged
      return { success: true }
    } catch (error: any) {
      console.error("Google sign in error:", error)
      return { 
        success: false, 
        error: error.message || "Failed to sign in with Google" 
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
      
      // User will be automatically set via onAuthStateChanged
      return { success: true }
    } catch (error: any) {
      console.error("Login error:", error)
      let errorMessage = "Failed to sign in"
      
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email"
          break
        case "auth/wrong-password":
          errorMessage = "Incorrect password"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later"
          break
        default:
          errorMessage = error.message || "Failed to sign in"
      }
      
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update profile with display name
      if (result.user) {
        await updateProfile(result.user, { displayName: name })
      }
      
      // User will be automatically set via onAuthStateChanged
      return { success: true }
    } catch (error: any) {
      console.error("Signup error:", error)
      let errorMessage = "Failed to create account"
      
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists"
          break
        case "auth/weak-password":
          errorMessage = "Password should be at least 6 characters"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        default:
          errorMessage = error.message || "Failed to create account"
      }
      
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth)
      setUser(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    loginWithGoogle,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
