import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

// Get transfer job status and user's active transfers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    if (jobId) {
      // Get specific job status
      const jobDoc = await getDoc(doc(db, 'transferJobs', jobId))
      if (!jobDoc.exists()) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      
      const jobData = jobDoc.data()
      return NextResponse.json({ 
        job: {
          id: jobData.id,
          status: jobData.status,
          progress: jobData.progress || 0,
          error: jobData.error,
          createdAt: jobData.createdAt,
          startedAt: jobData.startedAt,
          completedAt: jobData.completedAt,
          sourceService: jobData.sourceService,
          destinationService: jobData.destinationService,
          sourceFiles: jobData.sourceFiles,
          retryCount: jobData.retryCount || 0,
          maxRetries: jobData.maxRetries || 3
        }
      })
    } else {
      // Get all active jobs for user
      let jobs: any[] = []
      let recentJobs: any[] = []

      try {
        const userJobsQuery = query(
          collection(db, 'users', userId, 'transferJobs'),
          where('status', 'in', ['queued', 'processing', 'paused']),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        
        const userJobsSnapshot = await getDocs(userJobsQuery)
        jobs = userJobsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            status: data.status,
            progress: data.progress || 0,
            error: data.error,
            createdAt: data.createdAt,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            sourceService: data.sourceService,
            destinationService: data.destinationService,
            sourceFiles: data.sourceFiles,
            retryCount: data.retryCount || 0,
            maxRetries: data.maxRetries || 3
          }
        })
      } catch (activeError) {
        console.warn('⚠️ No active jobs found or collection does not exist:', activeError)
        jobs = []
      }

      try {
        // Get recent completed/failed jobs
        const recentJobsQuery = query(
          collection(db, 'users', userId, 'transferJobs'),
          where('status', 'in', ['completed', 'failed']),
          orderBy('completedAt', 'desc'),
          limit(20)
        )
        
        const recentJobsSnapshot = await getDocs(recentJobsQuery)
        recentJobs = recentJobsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            status: data.status,
            progress: data.progress || 0,
            error: data.error,
            createdAt: data.createdAt,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            sourceService: data.sourceService,
            destinationService: data.destinationService,
            sourceFiles: data.sourceFiles,
            retryCount: data.retryCount || 0,
            maxRetries: data.maxRetries || 3
          }
        })
      } catch (recentError) {
        console.warn('⚠️ No recent jobs found or collection does not exist:', recentError)
        recentJobs = []
      }

      return NextResponse.json({ 
        activeJobs: jobs,
        recentJobs: recentJobs,
        totalActive: jobs.length,
        totalRecent: recentJobs.length
      })
    }

  } catch (error) {
    console.error('❌ Error fetching transfer status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfer status' }, 
      { status: 500 }
    )
  }
}
