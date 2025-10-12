# Firebase Authentication Setup

This project now uses real Firebase authentication instead of mock authentication.

## What's Been Added

1. **Firebase SDK**: Installed Firebase v10+ for authentication and Firestore
2. **Real Authentication**: 
   - Email/password sign up and sign in
   - Google OAuth sign in
   - User session management
   - Automatic user data creation in Firestore

## Configuration

The Firebase configuration is stored in `lib/firebase.ts` with the following credentials:
- Project ID: `aust2-b8d21`
- Auth Domain: `aust2-b8d21.firebaseapp.com`
- Storage Bucket: `aust2-b8d21.firebasestorage.app`

## Features

### Authentication Methods
- **Email/Password**: Users can create accounts with email and password
- **Google Sign-In**: One-click Google OAuth authentication
- **Session Persistence**: Users stay logged in across browser sessions

### User Management
- Automatic user profile creation in Firestore
- User data includes: name, email, plan, usage statistics
- Secure user ID generation using Firebase UID

### Security
- Firebase handles all authentication security
- No passwords stored in local storage
- Automatic token refresh and session management

## Database Structure

Users are stored in Firestore with the following structure:
```
users/{userId}
├── name: string
├── email: string
├── plan: "free" | "pro" | "enterprise"
└── usage: {
    transfersThisMonth: number,
    storageUsed: number
}
```

## Usage

The authentication system is fully integrated into the existing UI:
- Login page (`/login`)
- Signup page (`/signup`)
- Dashboard (`/dashboard`)
- All protected routes automatically redirect unauthenticated users

## Next Steps

To complete the setup, you may want to:
1. Set up Firebase Authentication rules
2. Configure Firestore security rules
3. Add password reset functionality
4. Implement email verification
5. Add additional OAuth providers (GitHub, Microsoft, etc.)

## Testing

You can test the authentication by:
1. Creating a new account with email/password
2. Signing in with Google
3. Checking that user data is created in Firestore
4. Verifying session persistence across page refreshes
