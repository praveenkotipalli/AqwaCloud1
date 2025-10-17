import { NextRequest, NextResponse } from 'next/server'

// Simple fallback API for testing persistent transfers
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
    
    console.log(`📋 Simple transfer queued: ${jobId} for user: ${userId}`)
    console.log(`📁 Source: ${sourceService} → Destination: ${destinationService}`)
    console.log(`📄 Files: ${sourceFiles.length}`)

    // For now, just return success - in production this would queue the job
    return NextResponse.json({ 
      success: true, 
      jobId,
      message: 'Transfer job queued successfully (simple mode)',
      status: 'queued',
      progress: 0
    })

  } catch (error) {
    console.error('❌ Error in simple transfer API:', error)
    return NextResponse.json(
      { error: 'Failed to queue transfer' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Return empty arrays for now - in production this would fetch from database
    return NextResponse.json({ 
      activeJobs: [],
      recentJobs: [],
      totalActive: 0,
      totalRecent: 0,
      message: 'Simple mode - no persistent jobs yet'
    })

  } catch (error) {
    console.error('❌ Error in simple transfer status API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfer status' }, 
      { status: 500 }
    )
  }
}
