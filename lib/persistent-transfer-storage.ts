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
    await setDoc(doc(db, 'activeTransfers', job.id), {
      ...job,
      updatedAt: serverTimestamp()
    })
    
    // Also store in user's transfer history
    await setDoc(doc(db, 'users', job.userId, 'activeTransfers', job.id), {
      ...job,
      updatedAt: serverTimestamp()
    })
    
    console.log(`💾 Stored transfer job: ${job.id}`)
  } catch (error) {
    console.error('❌ Error storing transfer job:', error)
    throw error
  }
}

// Get all active transfers for a user
export async function getActiveTransfers(userId: string): Promise<StoredTransferJob[]> {
  try {
    const userTransfersQuery = query(
      collection(db, 'users', userId, 'activeTransfers'),
      where('status', 'in', ['pending', 'transferring', 'paused']),
      orderBy('startTime', 'desc')
    )
    
    const snapshot = await getDocs(userTransfersQuery)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredTransferJob))
  } catch (error) {
    console.error('❌ Error fetching active transfers:', error)
    return []
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
    console.error('❌ Error updating transfer job:', error)
    throw error
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
