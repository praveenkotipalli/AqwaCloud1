# OneDrive Integration Setup Guide

## Overview
This guide explains how to set up OneDrive integration with real accounts in AqwaCloud, similar to the existing Google Drive integration.

## Prerequisites
- OneDrive OAuth credentials (already provided)
- Next.js development environment
- Access to Microsoft Graph API

## OneDrive OAuth Credentials
The following credentials have been configured:

```
NEXT_PUBLIC_ONEDRIVE_CLIENT_ID=d5edfa6f-cee9-4160-b6fc-f1ec28f8b3ff

```

## Environment Variables Setup

Create a `.env.local` file in your project root with the following content:

```bash
# OneDrive OAuth Configuration  
NEXT_PUBLIC_ONEDRIVE_CLIENT_ID=d5edfa6f-cee9-4160-b6fc-f1ec28f8b3ff

# Google OAuth Configuration (if not already set)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Base URL for OAuth redirects
NEXTAUTH_URL=http://localhost:3000
```

## What's Been Implemented

### 1. OneDrive Service Library (`lib/onedrive.ts`)
- Complete Microsoft Graph API integration
- File and folder browsing with pagination
- Search functionality
- Storage quota information
- User profile retrieval
- Token validation

### 2. OAuth Flow
- OneDrive OAuth callback page (`app/auth/onedrive/callback/page.tsx`)
- Token exchange API route (`app/api/auth/onedrive/token/route.ts`)
- Secure state parameter validation

### 3. OneDrive Explorer Component (`components/onedrive-explorer.tsx`)
- File and folder display
- Navigation between folders
- File selection with checkboxes
- Search functionality
- Pagination support
- Error handling

### 4. Integration with Existing System
- Updated `useCloudConnections` hook
- Added OneDrive connection support
- Integrated with connection manager
- Added to test-drive page

## How It Works

### 1. Connection Process
1. User clicks "Connect" on OneDrive in the Connection Manager
2. User is redirected to Microsoft OAuth page
3. User grants permissions to AqwaCloud
4. Microsoft redirects back with authorization code
5. AqwaCloud exchanges code for access token
6. OneDrive connection is established

### 2. File Browsing
1. Once connected, OneDrive files are loaded via Microsoft Graph API
2. Files and folders are displayed in a tree structure
3. Users can navigate into folders
4. Pagination is supported for large file collections
5. Search functionality works across all files

### 3. API Endpoints Used
- `GET /me/drive/root/children` - List root files
- `GET /me/drive/items/{id}/children` - List folder contents
- `GET /me/drive/items/{id}` - Get file metadata
- `GET /me/drive/root/search(q='{query}')` - Search files
- `GET /me/drive` - Get storage quota
- `GET /me` - Get user profile

## Testing the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:3000/test-drive
   ```

3. **Connect OneDrive:**
   - Click "Connect" on OneDrive in the Connection Manager
   - Complete Microsoft OAuth flow
   - Verify connection status shows "connected"

4. **Browse files:**
   - OneDrive explorer should appear
   - Navigate through folders
   - Test search functionality
   - Verify file selection works

## Troubleshooting

### Common Issues

1. **"Invalid client_id" error:**
   - Verify `ONEDRIVE_CLIENT_ID` matches exactly
   - Check that the client ID is registered in Azure portal

2. **"Invalid redirect URI" error:**
   - Ensure redirect URI in Azure portal matches `/auth/onedrive/callback`
   - Check `NEXTAUTH_URL` environment variable

3. **"Insufficient privileges" error:**
   - Verify the app has `Files.ReadWrite.All` permission
   - Check admin consent has been granted

4. **Files not loading:**
   - Check browser console for API errors
   - Verify access token is valid
   - Check Microsoft Graph API status

### Debug Information
The test-drive page includes debug information showing:
- Environment variable status
- Connection details for both services
- Real-time connection status

## Security Considerations

1. **State Parameter:** OAuth state parameter is validated to prevent CSRF attacks
2. **Token Storage:** Access tokens are stored in localStorage (consider moving to secure HTTP-only cookies in production)
3. **Scope Limitation:** Only requests necessary permissions (`Files.ReadWrite.All`)
4. **Error Handling:** Sensitive error details are not exposed to the client

## Next Steps

1. **Production Deployment:**
   - Update redirect URIs for production domain
   - Use secure token storage
   - Implement token refresh logic

2. **Additional Features:**
   - File upload/download
   - File sharing
   - Real-time sync
   - Transfer between services

3. **Monitoring:**
   - Add logging for OAuth flows
   - Monitor API rate limits
   - Track connection success rates

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Test the OAuth flow step by step
4. Check Microsoft Graph API documentation for endpoint changes
