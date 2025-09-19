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
  storageCost: number
  egressCost: number
  apiCost: number
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

  // Calculate cost analysis for different cloud providers
  static calculateCost(fileSizes: number[], provider: 'google' | 'microsoft' | 'aws' | 'azure' | 'google-drive' | 'onedrive'): CostAnalysis {
    const totalGB = fileSizes.reduce((sum, size) => sum + size, 0) / (1024 * 1024 * 1024)
    
    // Pricing per GB (as of 2024, these are approximate rates)
    const pricing = {
      google: {
        storage: 0.020, // $0.020 per GB per month
        egress: 0.12,   // $0.12 per GB for egress
        api: 0.0001     // $0.0001 per 1000 API calls
      },
      microsoft: {
        storage: 0.022, // $0.022 per GB per month
        egress: 0.087,  // $0.087 per GB for egress
        api: 0.0001     // $0.0001 per 1000 API calls
      },
      aws: {
        storage: 0.023, // $0.023 per GB per month
        egress: 0.09,   // $0.09 per GB for egress
        api: 0.0004     // $0.0004 per 1000 API calls
      },
      azure: {
        storage: 0.021, // $0.021 per GB per month
        egress: 0.087,  // $0.087 per GB for egress
        api: 0.0001     // $0.0001 per 1000 API calls
      }
    }

    // Handle provider mapping - convert service names to pricing keys
    let pricingKey: keyof typeof pricing = 'google' // default
    if (provider === 'google' || provider === 'google-drive') {
      pricingKey = 'google'
    } else if (provider === 'microsoft' || provider === 'onedrive') {
      pricingKey = 'microsoft'
    } else if (provider === 'aws') {
      pricingKey = 'aws'
    } else if (provider === 'azure') {
      pricingKey = 'azure'
    }

    const rates = pricing[pricingKey]
    const estimatedApiCalls = Math.ceil(fileSizes.length * 2) // Rough estimate: 2 API calls per file
    
    const storageCost = totalGB * rates.storage
    const egressCost = totalGB * rates.egress
    const apiCost = (estimatedApiCalls / 1000) * rates.api
    const totalCost = storageCost + egressCost + apiCost

    return {
      provider,
      storageCost: Math.round(storageCost * 10000) / 10000, // Round to 4 decimal places
      egressCost: Math.round(egressCost * 10000) / 10000,
      apiCost: Math.round(apiCost * 10000) / 10000,
      totalCost: Math.round(totalCost * 10000) / 10000,
      currency: 'USD',
      breakdown: {
        storage: {
          cost: Math.round(storageCost * 10000) / 10000,
          description: `Storage cost (${totalGB.toFixed(2)} GB × $${rates.storage}/GB)`
        },
        egress: {
          cost: Math.round(egressCost * 10000) / 10000,
          description: `Data transfer cost (${totalGB.toFixed(2)} GB × $${rates.egress}/GB)`
        },
        api: {
          cost: Math.round(apiCost * 10000) / 10000,
          description: `API calls cost (${estimatedApiCalls} calls × $${rates.api}/1000)`
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
