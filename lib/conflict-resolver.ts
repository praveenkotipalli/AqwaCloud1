import { FileItem } from "@/hooks/use-cloud-connections"
import { ConflictResolution } from "./real-time-sync"

export interface Conflict {
  id: string
  sourceFile: FileItem
  destFile: FileItem
  conflictType: ConflictType
  detectedAt: Date
  resolution?: ConflictResolution
}

export enum ConflictType {
  MODIFIED_BOTH = 'modified_both',
  DELETED_SOURCE = 'deleted_source',
  DELETED_DEST = 'deleted_dest',
  SIZE_MISMATCH = 'size_mismatch',
  TIMESTAMP_MISMATCH = 'timestamp_mismatch',
  NAME_CONFLICT = 'name_conflict'
}

export interface ConflictDetectionResult {
  hasConflict: boolean
  conflictType?: ConflictType
  severity: 'low' | 'medium' | 'high'
  description: string
}

export interface AutoResolutionStrategy {
  type: ConflictType
  resolution: 'source_wins' | 'dest_wins' | 'merge' | 'manual'
  condition?: (source: FileItem, dest: FileItem) => boolean
}

export class ConflictResolver {
  private autoResolutionStrategies: AutoResolutionStrategy[] = [
    {
      type: ConflictType.DELETED_SOURCE,
      resolution: 'dest_wins',
      condition: (source, dest) => !source && !!dest
    },
    {
      type: ConflictType.DELETED_DEST,
      resolution: 'source_wins',
      condition: (source, dest) => !!source && !dest
    },
    {
      type: ConflictType.SIZE_MISMATCH,
      resolution: 'source_wins',
      condition: (source, dest) => {
        const sourceSize = parseInt(source.size?.replace(/[^\d]/g, '') || '0')
        const destSize = parseInt(dest.size?.replace(/[^\d]/g, '') || '0')
        return sourceSize > destSize // Prefer larger file
      }
    },
    {
      type: ConflictType.TIMESTAMP_MISMATCH,
      resolution: 'source_wins',
      condition: (source, dest) => {
        const sourceTime = new Date(source.modified || 0).getTime()
        const destTime = new Date(dest.modified || 0).getTime()
        return sourceTime > destTime // Prefer newer file
      }
    }
  ]

  // Detect conflicts between source and destination files
  detectConflict(sourceFile: FileItem, destFile: FileItem): ConflictDetectionResult {
    console.log(`🔍 Detecting conflict between ${sourceFile.name} and ${destFile.name}`)

    // Check if files exist
    if (!sourceFile && !destFile) {
      return {
        hasConflict: false,
        severity: 'low',
        description: 'Both files are missing'
      }
    }

    if (!sourceFile && destFile) {
      return {
        hasConflict: true,
        conflictType: ConflictType.DELETED_SOURCE,
        severity: 'medium',
        description: 'Source file was deleted but destination file exists'
      }
    }

    if (sourceFile && !destFile) {
      return {
        hasConflict: true,
        conflictType: ConflictType.DELETED_DEST,
        severity: 'medium',
        description: 'Destination file was deleted but source file exists'
      }
    }

    if (!sourceFile || !destFile) {
      return {
        hasConflict: false,
        severity: 'low',
        description: 'One file is missing, no conflict'
      }
    }

    // Check size mismatch
    const sourceSize = parseInt(sourceFile.size?.replace(/[^\d]/g, '') || '0')
    const destSize = parseInt(destFile.size?.replace(/[^\d]/g, '') || '0')
    
    if (Math.abs(sourceSize - destSize) > 0) {
      return {
        hasConflict: true,
        conflictType: ConflictType.SIZE_MISMATCH,
        severity: 'high',
        description: `File sizes differ: source=${sourceSize}, dest=${destSize}`
      }
    }

    // Check timestamp mismatch
    const sourceTime = new Date(sourceFile.modified || 0).getTime()
    const destTime = new Date(destFile.modified || 0).getTime()
    const timeDiff = Math.abs(sourceTime - destTime)
    
    if (timeDiff > 1000) { // More than 1 second difference
      return {
        hasConflict: true,
        conflictType: ConflictType.TIMESTAMP_MISMATCH,
        severity: 'medium',
        description: `Modification times differ: source=${sourceFile.modified}, dest=${destFile.modified}`
      }
    }

    // Check name conflict
    if (sourceFile.name !== destFile.name) {
      return {
        hasConflict: true,
        conflictType: ConflictType.NAME_CONFLICT,
        severity: 'low',
        description: `File names differ: source="${sourceFile.name}", dest="${destFile.name}"`
      }
    }

    // Check if both files were modified
    if (sourceTime !== destTime && sourceTime > 0 && destTime > 0) {
      return {
        hasConflict: true,
        conflictType: ConflictType.MODIFIED_BOTH,
        severity: 'high',
        description: 'Both files were modified independently'
      }
    }

    return {
      hasConflict: false,
      severity: 'low',
      description: 'No conflicts detected'
    }
  }

  // Auto-resolve conflict based on strategies
  autoResolveConflict(conflict: Conflict): ConflictResolution | null {
    console.log(`🤖 Attempting auto-resolution for conflict: ${conflict.conflictType}`)

    const strategy = this.autoResolutionStrategies.find(s => s.type === conflict.conflictType)
    
    if (!strategy) {
      console.log(`❌ No auto-resolution strategy found for ${conflict.conflictType}`)
      return null
    }

    // Check if condition is met
    if (strategy.condition && !strategy.condition(conflict.sourceFile, conflict.destFile)) {
      console.log(`❌ Auto-resolution condition not met for ${conflict.conflictType}`)
      return null
    }

    const resolution: ConflictResolution = {
      type: strategy.resolution,
      resolvedFile: this.applyResolution(conflict, strategy.resolution),
      timestamp: new Date()
    }

    console.log(`✅ Auto-resolved conflict using strategy: ${strategy.resolution}`)
    return resolution
  }

  // Apply resolution to get the resolved file
  private applyResolution(conflict: Conflict, resolution: 'source_wins' | 'dest_wins' | 'merge' | 'manual'): FileItem {
    switch (resolution) {
      case 'source_wins':
        return {
          ...conflict.sourceFile,
          name: conflict.sourceFile.name,
          modified: new Date().toISOString()
        }
      
      case 'dest_wins':
        return {
          ...conflict.destFile,
          name: conflict.destFile.name,
          modified: new Date().toISOString()
        }
      
      case 'merge':
        // For merge, prefer source but keep destination metadata where appropriate
        return {
          ...conflict.sourceFile,
          name: conflict.sourceFile.name,
          modified: new Date().toISOString(),
          // Could add merge logic here for specific file types
        }
      
      case 'manual':
        // Return source file as default for manual resolution
        return conflict.sourceFile
      
      default:
        return conflict.sourceFile
    }
  }

  // Manual conflict resolution
  resolveConflictManually(
    conflict: Conflict, 
    resolution: 'source_wins' | 'dest_wins' | 'merge'
  ): ConflictResolution {
    console.log(`👤 Manual resolution for conflict ${conflict.id}: ${resolution}`)

    const conflictResolution: ConflictResolution = {
      type: resolution,
      resolvedFile: this.applyResolution(conflict, resolution),
      timestamp: new Date()
    }

    return conflictResolution
  }

  // Get conflict severity score
  getConflictSeverity(conflict: Conflict): number {
    const severityScores = {
      [ConflictType.MODIFIED_BOTH]: 10,
      [ConflictType.SIZE_MISMATCH]: 8,
      [ConflictType.TIMESTAMP_MISMATCH]: 5,
      [ConflictType.DELETED_SOURCE]: 6,
      [ConflictType.DELETED_DEST]: 6,
      [ConflictType.NAME_CONFLICT]: 2
    }

    return severityScores[conflict.conflictType] || 0
  }

  // Get suggested resolution for a conflict
  getSuggestedResolution(conflict: Conflict): 'source_wins' | 'dest_wins' | 'merge' | 'manual' {
    switch (conflict.conflictType) {
      case ConflictType.MODIFIED_BOTH:
        // Prefer newer file
        const sourceTime = new Date(conflict.sourceFile.modified || 0).getTime()
        const destTime = new Date(conflict.destFile.modified || 0).getTime()
        return sourceTime > destTime ? 'source_wins' : 'dest_wins'
      
      case ConflictType.SIZE_MISMATCH:
        // Prefer larger file (might be more complete)
        const sourceSize = parseInt(conflict.sourceFile.size?.replace(/[^\d]/g, '') || '0')
        const destSize = parseInt(conflict.destFile.size?.replace(/[^\d]/g, '') || '0')
        return sourceSize > destSize ? 'source_wins' : 'dest_wins'
      
      case ConflictType.TIMESTAMP_MISMATCH:
        // Prefer newer file
        return new Date(conflict.sourceFile.modified || 0).getTime() > 
               new Date(conflict.destFile.modified || 0).getTime() ? 'source_wins' : 'dest_wins'
      
      case ConflictType.DELETED_SOURCE:
        return 'dest_wins'
      
      case ConflictType.DELETED_DEST:
        return 'source_wins'
      
      case ConflictType.NAME_CONFLICT:
        return 'manual' // Names should be resolved manually
      
      default:
        return 'manual'
    }
  }

  // Add custom auto-resolution strategy
  addAutoResolutionStrategy(strategy: AutoResolutionStrategy): void {
    this.autoResolutionStrategies.push(strategy)
    console.log(`➕ Added auto-resolution strategy for ${strategy.type}`)
  }

  // Remove auto-resolution strategy
  removeAutoResolutionStrategy(conflictType: ConflictType): void {
    const index = this.autoResolutionStrategies.findIndex(s => s.type === conflictType)
    if (index !== -1) {
      this.autoResolutionStrategies.splice(index, 1)
      console.log(`➖ Removed auto-resolution strategy for ${conflictType}`)
    }
  }

  // Get all auto-resolution strategies
  getAutoResolutionStrategies(): AutoResolutionStrategy[] {
    return [...this.autoResolutionStrategies]
  }
}

// Singleton instance
let conflictResolverInstance: ConflictResolver | null = null

export function getConflictResolver(): ConflictResolver {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver()
  }
  return conflictResolverInstance
}
