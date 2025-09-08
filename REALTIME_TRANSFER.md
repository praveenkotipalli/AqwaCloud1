# Real-Time File Transfer Implementation

This document describes the implementation of real-time file transfer from Google Drive to OneDrive in AqwaCloud.

## Overview

The real-time transfer system provides:
- **Live file synchronization** between Google Drive and OneDrive
- **Conflict detection and resolution** for simultaneous edits
- **Background processing** with queue management
- **WebSocket-based real-time updates**
- **File change monitoring** with automatic sync triggers

## Architecture

### Core Components

1. **RealTimeSyncService** (`lib/real-time-sync.ts`)
   - WebSocket communication for real-time updates
   - Handles connection management and reconnection
   - Broadcasts transfer updates and file changes

2. **FileMonitorService** (`lib/file-monitor.ts`)
   - Monitors files for changes using polling
   - Detects file modifications, deletions, and moves
   - Triggers sync events when changes are detected

3. **ConflictResolver** (`lib/conflict-resolver.ts`)
   - Detects conflicts between source and destination files
   - Provides auto-resolution strategies
   - Handles manual conflict resolution

4. **BackgroundSyncService** (`lib/background-sync.ts`)
   - Manages transfer queue and job processing
   - Handles concurrent transfers with rate limiting
   - Provides retry mechanisms for failed transfers

5. **RealTimeTransferService** (`lib/realtime-transfer-service.ts`)
   - Main orchestrator that ties all components together
   - Manages transfer sessions and file monitoring
   - Coordinates conflict resolution and real-time updates

## Features

### Real-Time Synchronization
- **WebSocket Connection**: Establishes persistent connection for real-time updates
- **File Change Detection**: Monitors files every 30 seconds for changes
- **Automatic Sync**: Triggers transfers when file changes are detected
- **Progress Updates**: Real-time progress reporting via WebSocket

### Conflict Resolution
- **Automatic Detection**: Identifies conflicts based on file metadata
- **Smart Resolution**: Prefers newer files, larger files, or source files based on strategy
- **Manual Override**: Allows manual conflict resolution when auto-resolution fails
- **Conflict Types**: Handles size mismatches, timestamp conflicts, and simultaneous edits

### Background Processing
- **Queue Management**: Processes transfers in background with configurable concurrency
- **Retry Logic**: Automatically retries failed transfers with exponential backoff
- **Rate Limiting**: Respects API rate limits for both Google Drive and OneDrive
- **Progress Tracking**: Maintains detailed progress information for each transfer

### Session Management
- **Transfer Sessions**: Groups related transfers into manageable sessions
- **Session Lifecycle**: Handles session creation, monitoring, and cleanup
- **Multiple Sessions**: Supports multiple concurrent transfer sessions
- **Session Statistics**: Provides real-time statistics for active sessions

## Usage

### Starting a Real-Time Transfer

```typescript
import { getRealTimeTransferService } from '@/lib/realtime-transfer-service'

const transferService = getRealTimeTransferService()

// Start a real-time transfer session
const sessionId = await transferService.startTransferSession(
  sourceConnection,    // Google Drive connection
  destConnection,      // OneDrive connection
  selectedFiles       // Array of files to transfer
)
```

### Using the Hook

```typescript
import { useCloudConnections } from '@/hooks/use-cloud-connections'

const {
  startRealTimeTransfer,
  stopRealTimeTransfer,
  getRealTimeStats,
  activeSessions
} = useCloudConnections()

// Start real-time transfer
const jobId = await startRealTimeTransfer(
  'google-drive',
  'onedrive',
  selectedFiles,
  '/',
  true // enable real-time
)

// Get statistics
const stats = getRealTimeStats()
console.log('Active sessions:', stats.activeSessions)
console.log('Monitored files:', stats.monitoredFiles)
```

### UI Integration

The transfer page (`app/transfer/page.tsx`) includes:
- **Real-Time Toggle**: Enable/disable real-time synchronization
- **Session Management**: View and control active transfer sessions
- **Live Statistics**: Real-time statistics display
- **Conflict Indicators**: Visual indicators for resolved conflicts
- **Progress Tracking**: Live progress updates for transfers

## Configuration

### Real-Time Transfer Config

```typescript
interface RealTimeTransferConfig {
  enableRealTimeSync: boolean      // Enable WebSocket communication
  autoResolveConflicts: boolean   // Auto-resolve conflicts
  syncInterval: number            // File monitoring interval (ms)
  maxConcurrentTransfers: number  // Max concurrent transfers
  enableFileMonitoring: boolean   // Enable file change monitoring
  conflictResolutionStrategy: 'auto' | 'manual' | 'prompt'
}
```

### File Monitor Config

```typescript
interface FileMonitorConfig {
  pollInterval: number    // Polling interval (default: 30000ms)
  maxRetries: number     // Max retry attempts (default: 3)
  retryDelay: number     // Retry delay (default: 5000ms)
}
```

## WebSocket Server

A WebSocket server (`websocket-server.js`) provides real-time communication:

```bash
# Install dependencies
npm install ws concurrently

# Run WebSocket server
npm run websocket

# Run both Next.js and WebSocket server
npm run dev:full
```

### WebSocket Events

- **Connection**: Welcome message when client connects
- **File Changes**: Real-time file change notifications
- **Progress Updates**: Transfer progress updates
- **Conflict Notifications**: Conflict detection alerts
- **Transfer Status**: Transfer completion/failure notifications

## API Integration

### Google Drive API
- **File Monitoring**: Uses `files.get` to check file metadata
- **Change Detection**: Compares modification times and file sizes
- **Rate Limiting**: Respects 1000 requests/100 seconds limit

### OneDrive API
- **File Monitoring**: Uses Microsoft Graph API `/me/drive/items/{id}`
- **Change Detection**: Compares `lastModifiedDateTime` and file sizes
- **Rate Limiting**: Respects 10000 requests/10 minutes limit

## Error Handling

### Connection Errors
- **WebSocket Reconnection**: Automatic reconnection with exponential backoff
- **API Failures**: Retry logic with configurable attempts
- **Token Refresh**: Automatic token refresh for expired credentials

### Transfer Errors
- **File Not Found**: Graceful handling of deleted files
- **Permission Errors**: Clear error messages for insufficient permissions
- **Network Issues**: Retry mechanisms for network failures

### Conflict Handling
- **Auto-Resolution**: Attempts automatic conflict resolution
- **Manual Override**: Fallback to manual resolution
- **Conflict Logging**: Detailed logging of conflict resolution decisions

## Performance Considerations

### Optimization Strategies
- **Chunked Processing**: Process large files in chunks
- **Concurrent Limits**: Configurable concurrent transfer limits
- **Caching**: Cache file metadata to reduce API calls
- **Compression**: Optional file compression for large transfers

### Rate Limiting
- **Google Drive**: 1000 requests/100 seconds
- **OneDrive**: 10000 requests/10 minutes
- **Intelligent Queuing**: Queue management to respect rate limits

## Security

### Token Management
- **Secure Storage**: Access tokens stored securely
- **Automatic Refresh**: Token refresh before expiration
- **Scope Validation**: Ensures proper API permissions

### WebSocket Security
- **State Validation**: OAuth state parameter validation
- **Connection Limits**: Prevents connection flooding
- **Message Validation**: Validates all incoming messages

## Monitoring and Debugging

### Real-Time Statistics
- **Active Sessions**: Number of active transfer sessions
- **Monitored Files**: Number of files being monitored
- **Queue Status**: Pending, transferring, completed, failed counts
- **Transfer Progress**: Real-time progress for each transfer

### Debug Information
- **Console Logging**: Detailed console logs for debugging
- **WebSocket Status**: Connection status and message flow
- **API Calls**: Logged API requests and responses
- **Error Tracking**: Comprehensive error logging

## Future Enhancements

### Planned Features
- **Bidirectional Sync**: Sync changes in both directions
- **Selective Sync**: Sync only specific folders or file types
- **Scheduled Sync**: Automated sync at specific times
- **Bandwidth Control**: Configurable transfer speed limits
- **File Versioning**: Keep multiple versions of files

### Advanced Features
- **Delta Sync**: Only transfer changed portions of files
- **Compression**: Built-in file compression
- **Encryption**: End-to-end encryption for sensitive files
- **Audit Logging**: Detailed audit trail of all operations

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if WebSocket server is running on port 3001
   - Verify firewall settings
   - Check browser WebSocket support

2. **File Changes Not Detected**
   - Verify file monitoring is enabled
   - Check polling interval configuration
   - Ensure files are being monitored

3. **Conflicts Not Resolved**
   - Check conflict resolution strategy
   - Verify auto-resolution conditions
   - Review conflict resolution logs

4. **Transfer Failures**
   - Check API rate limits
   - Verify access tokens are valid
   - Review error logs for specific issues

### Debug Commands

```bash
# Check WebSocket server status
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:3001

# Monitor WebSocket messages
# Use browser developer tools Network tab to monitor WebSocket traffic
```

## Conclusion

The real-time transfer system provides a robust, scalable solution for synchronizing files between Google Drive and OneDrive. With comprehensive conflict resolution, background processing, and real-time updates, it offers a seamless user experience while maintaining data integrity and performance.
