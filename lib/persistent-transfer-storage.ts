import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

export interface StoredTransferJob {
  id: string
  userId: string
  sourceService: string
  destinationService: string
  sourceFiles: any[]
  destinationPath: string
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed'
  progress: number
  startTime: number
  pausedAt?: number
  completedAt?: number
  error?: string
  currentFileIndex: number
  totalFiles: number
  transferredBytes: number
  totalBytes: number
}

// Store a transfer job in the database
export async function storeTransferJob(job: StoredTransferJob): Promise<void> {
  try {
    // Try to store in main collection first
    await setDoc(doc(db, 'activeTransfers', job.id), {
      ...job,
      updatedAt: serverTimestamp()
    })
    
    // Try to store in user's collection
    await setDoc(doc(db, 'users', job.userId, 'activeTransfers', job.id), {
      ...job,
      updatedAt: serverTimestamp()
    })
    
    console.log(`💾 Stored transfer job: ${job.id}`)
  } catch (error) {
    console.error('❌ Error storing transfer job:', error)
    
    // Fallback: Store in localStorage for persistence
    try {
      const existingJobs = JSON.parse(localStorage.getItem('persistentTransfers') || '[]')
      existingJobs.push(job)
      localStorage.setItem('persistentTransfers', JSON.stringify(existingJobs))
      console.log(`💾 Stored transfer job in localStorage: ${job.id}`)
    } catch (localError) {
      console.error('❌ Error storing in localStorage:', localError)
      throw error // Re-throw original error if localStorage also fails
    }
  }
}

// Get all active transfers for a user
export async function getActiveTransfers(userId: string): Promise<StoredTransferJob[]> {
  try {
    // Simplified query without complex ordering to avoid index requirements
    const userTransfersQuery = query(
      collection(db, 'users', userId, 'activeTransfers'),
      where('status', 'in', ['pending', 'transferring', 'paused'])
    )
    
    const snapshot = await getDocs(userTransfersQuery)
    const transfers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredTransferJob))
    
    // Sort in memory to avoid index requirements
    return transfers.sort((a, b) => b.startTime - a.startTime)
  } catch (error) {
    console.error('❌ Error fetching active transfers from database:', error)
    
    // Fallback: Get from localStorage
    try {
      const storedJobs = JSON.parse(localStorage.getItem('persistentTransfers') || '[]')
      const userJobs = storedJobs.filter((job: StoredTransferJob) => 
        job.userId === userId && 
        ['pending', 'transferring', 'paused'].includes(job.status)
      )
      console.log(`💾 Retrieved ${userJobs.length} transfers from localStorage`)
      return userJobs.sort((a, b) => b.startTime - a.startTime)
    } catch (localError) {
      console.error('❌ Error fetching from localStorage:', localError)
      return []
    }
  }
}

// Update transfer job status
export async function updateTransferJob(
  jobId: string, 
  userId: string, 
  updates: Partial<StoredTransferJob>
): Promise<void> {
  try {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    }
    
    // Update main document
    await updateDoc(doc(db, 'activeTransfers', jobId), updateData)
    
    // Update user's document
    await updateDoc(doc(db, 'users', userId, 'activeTransfers', jobId), updateData)
    
    console.log(`📝 Updated transfer job: ${jobId}`)
  } catch (error) {
    console.error('❌ Error updating transfer job in database:', error)
    
    // Fallback: Update in localStorage
    try {
      const storedJobs = JSON.parse(localStorage.getItem('persistentTransfers') || '[]')
      const jobIndex = storedJobs.findIndex((job: StoredTransferJob) => job.id === jobId)
      
      if (jobIndex !== -1) {
        storedJobs[jobIndex] = { ...storedJobs[jobIndex], ...updates, updatedAt: Date.now() }
        localStorage.setItem('persistentTransfers', JSON.stringify(storedJobs))
        console.log(`📝 Updated transfer job in localStorage: ${jobId}`)
      }
    } catch (localError) {
      console.error('❌ Error updating in localStorage:', localError)
      throw error // Re-throw original error if localStorage also fails
    }
  }
}

// Remove completed/failed transfers from active list
export async function archiveTransferJob(jobId: string, userId: string): Promise<void> {
  try {
    // Move to completed transfers
    const jobDoc = await getDoc(doc(db, 'activeTransfers', jobId))
    if (jobDoc.exists()) {
      const jobData = jobDoc.data()
      await setDoc(doc(db, 'users', userId, 'completedTransfers', jobId), {
        ...jobData,
        archivedAt: serverTimestamp()
      })
    }
    
    // Remove from active transfers
    await updateDoc(doc(db, 'activeTransfers', jobId), {
      status: 'archived',
      archivedAt: serverTimestamp()
    })
    
    await updateDoc(doc(db, 'users', userId, 'activeTransfers', jobId), {
      status: 'archived',
      archivedAt: serverTimestamp()
    })
    
    console.log(`📦 Archived transfer job: ${jobId}`)
  } catch (error) {
    console.error('❌ Error archiving transfer job:', error)
    throw error
  }
}
