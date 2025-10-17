import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { auth } from '@/lib/firebase'

export interface PersistentTransferJob {
  id: string
  userId: string
  sourceService: string
  destinationService: string
  sourceFiles: any[]
  destinationPath: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused'
  progress: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  retryCount: number
  maxRetries: number
  priority: number
}

// Queue a new transfer job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sourceService, 
      destinationService, 
      sourceFiles, 
      destinationPath = 'root',
      userId,
      priority = 1 
    } = body

    if (!userId || !sourceService || !destinationService || !sourceFiles?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const jobId = `transfer_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const transferJob: PersistentTransferJob = {
      id: jobId,
      userId,
      sourceService,
      destinationService,
      sourceFiles,
      destinationPath,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      priority
    }

    // Save to Firestore
    await setDoc(doc(db, 'transferJobs', jobId), {
      ...transferJob,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Add to user's transfer history
    await setDoc(doc(db, 'users', userId, 'transferJobs', jobId), {
      ...transferJob,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    console.log(`📋 Queued transfer job: ${jobId} for user: ${userId}`)

    return NextResponse.json({ 
      success: true, 
      jobId,
      message: 'Transfer job queued successfully' 
    })

  } catch (error) {
    console.error('❌ Error queuing transfer:', error)
    return NextResponse.json(
      { error: 'Failed to queue transfer' }, 
      { status: 500 }
    )
  }
}

// Get transfer job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const userId = searchParams.get('userId')

    if (!jobId && !userId) {
      return NextResponse.json({ error: 'Missing jobId or userId' }, { status: 400 })
    }

    if (jobId) {
      // Get specific job
      const jobDoc = await getDoc(doc(db, 'transferJobs', jobId))
      if (!jobDoc.exists()) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      
      const jobData = jobDoc.data()
      return NextResponse.json({ job: jobData })
    } else {
      // Get all jobs for user
      const userJobsQuery = query(
        collection(db, 'users', userId!, 'transferJobs'),
        where('status', 'in', ['queued', 'processing', 'paused'])
      )
      const userJobsSnapshot = await getDocs(userJobsQuery)
      const jobs = userJobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      return NextResponse.json({ jobs })
    }

  } catch (error) {
    console.error('❌ Error fetching transfer status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfer status' }, 
      { status: 500 }
    )
  }
}

// Update transfer job status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, status, progress, error, userId } = body

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    const updateData: any = {
      updatedAt: serverTimestamp()
    }

    if (status) updateData.status = status
    if (progress !== undefined) updateData.progress = progress
    if (error) updateData.error = error
    if (status === 'processing') updateData.startedAt = serverTimestamp()
    if (status === 'completed' || status === 'failed') updateData.completedAt = serverTimestamp()

    // Update main job document
    await updateDoc(doc(db, 'transferJobs', jobId), updateData)

    // Update user's job document
    if (userId) {
      await updateDoc(doc(db, 'users', userId, 'transferJobs', jobId), updateData)
    }

    console.log(`📝 Updated transfer job ${jobId}: ${status} (${progress}%)`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Error updating transfer job:', error)
    return NextResponse.json(
      { error: 'Failed to update transfer job' }, 
      { status: 500 }
    )
  }
}
