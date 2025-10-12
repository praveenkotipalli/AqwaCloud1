export interface BandwidthInfo {
  totalBytes: number
  totalMB: number
  totalGB: number
  estimatedTimeSeconds: number
  estimatedTimeFormatted: string
  bandwidthMBps: number
  bandwidthMbps: number
}

export interface CostAnalysis {
  provider: 'google' | 'microsoft' | 'aws' | 'azure' | 'google-drive' | 'onedrive'
  totalCost: number
  currency: string
  breakdown: {
    storage: { cost: number; description: string }
    egress: { cost: number; description: string }
    api: { cost: number; description: string }
  }
}

export interface TransferEstimate {
  bandwidth: BandwidthInfo
  cost: CostAnalysis
  recommendations: string[]
}

export class BandwidthCalculator {
  private static readonly BANDWIDTH_TIERS = [
    { minMBps: 0, maxMBps: 1, description: 'Slow (1 Mbps)' },
    { minMBps: 1, maxMBps: 5, description: 'Moderate (5 Mbps)' },
    { minMBps: 5, maxMBps: 10, description: 'Fast (10 Mbps)' },
    { minMBps: 10, maxMBps: 50, description: 'Very Fast (50 Mbps)' },
    { minMBps: 50, maxMBps: Infinity, description: 'Ultra Fast (50+ Mbps)' }
  ]

  // Calculate bandwidth information for a transfer
  static calculateBandwidth(fileSizes: number[], bandwidthMBps: number = 5): BandwidthInfo {
    const totalBytes = fileSizes.reduce((sum, size) => sum + size, 0)
    const totalMB = totalBytes / (1024 * 1024)
    const totalGB = totalMB / 1024
    const estimatedTimeSeconds = totalMB / bandwidthMBps
    const bandwidthMbps = bandwidthMBps * 8 // Convert MBps to Mbps

    return {
      totalBytes,
      totalMB: Math.round(totalMB * 100) / 100,
      totalGB: Math.round(totalGB * 100) / 100,
      estimatedTimeSeconds: Math.round(estimatedTimeSeconds),
      estimatedTimeFormatted: this.formatTime(estimatedTimeSeconds),
      bandwidthMBps: Math.round(bandwidthMBps * 100) / 100,
      bandwidthMbps: Math.round(bandwidthMbps * 100) / 100
    }
  }

  // Calculate cost analysis for different cloud providers (Free platform)
  static calculateCost(fileSizes: number[], provider: 'google' | 'microsoft' | 'aws' | 'azure' | 'google-drive' | 'onedrive'): CostAnalysis {
    return {
      provider,
      totalCost: 0,
      currency: 'USD',
      breakdown: {
        storage: {
          cost: 0,
          description: 'Free storage'
        },
        egress: {
          cost: 0,
          description: 'Free data transfer'
        },
        api: {
          cost: 0,
          description: 'Free API usage'
        }
      }
    }
  }

  // Generate comprehensive transfer estimate
  static generateEstimate(
    fileSizes: number[], 
    sourceProvider: 'google' | 'microsoft' | 'aws' | 'azure' | 'google-drive' | 'onedrive',
    destinationProvider: 'google' | 'microsoft' | 'aws' | 'azure' | 'google-drive' | 'onedrive',
    bandwidthMBps: number = 5
  ): TransferEstimate {
    const bandwidth = this.calculateBandwidth(fileSizes, bandwidthMBps)
    
    // Calculate costs for both source and destination
    const sourceCost = this.calculateCost(fileSizes, sourceProvider)
    const destCost = this.calculateCost(fileSizes, destinationProvider)
    
    // Use the higher cost as the estimate (conservative approach)
    const cost = sourceCost.totalCost > destCost.totalCost ? sourceCost : destCost
    
    const recommendations = this.generateRecommendations(bandwidth, cost, fileSizes.length)
    
    return {
      bandwidth,
      cost,
      recommendations
    }
  }

  // Generate recommendations based on transfer characteristics
  private static generateRecommendations(
    bandwidth: BandwidthInfo, 
    cost: CostAnalysis, 
    fileCount: number
  ): string[] {
    const recommendations: string[] = []
    
    // Bandwidth recommendations
    if (bandwidth.bandwidthMBps < 1) {
      recommendations.push('Consider upgrading your internet connection for faster transfers')
    } else if (bandwidth.bandwidthMBps > 10) {
      recommendations.push('Your connection is excellent for large file transfers')
    }
    
    // File count recommendations
    if (fileCount > 100) {
      recommendations.push('Consider transferring files in batches to avoid timeouts')
    }
    
    // Size recommendations
    if (bandwidth.totalGB > 10) {
      recommendations.push('Large transfer detected - consider scheduling during off-peak hours')
    }
    
    // Cost recommendations
    if (cost.totalCost > 1) {
      recommendations.push('High transfer cost - consider compressing files before transfer')
    } else if (cost.totalCost < 0.01) {
      recommendations.push('Transfer cost is minimal')
    }
    
    // Time recommendations
    if (bandwidth.estimatedTimeSeconds > 3600) {
      recommendations.push('Long transfer time - consider using real-time sync for ongoing changes')
    }
    
    return recommendations
  }

  // Format time in human-readable format
  private static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.round(seconds % 60)
      return `${minutes}m ${remainingSeconds}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  // Get bandwidth tier description
  static getBandwidthTier(bandwidthMBps: number): string {
    const tier = this.BANDWIDTH_TIERS.find(t => 
      bandwidthMBps >= t.minMBps && bandwidthMBps < t.maxMBps
    )
    return tier?.description || 'Unknown'
  }

  // Estimate bandwidth based on file transfer history
  static estimateBandwidthFromHistory(transferHistory: Array<{size: number, duration: number}>): number {
    if (transferHistory.length === 0) return 5 // Default 5 MBps
    
    const totalSize = transferHistory.reduce((sum, t) => sum + t.size, 0)
    const totalDuration = transferHistory.reduce((sum, t) => sum + t.duration, 0)
    
    if (totalDuration === 0) return 5
    
    const avgMBps = (totalSize / (1024 * 1024)) / (totalDuration / 1000)
    return Math.max(0.1, Math.min(100, avgMBps)) // Clamp between 0.1 and 100 MBps
  }
}
