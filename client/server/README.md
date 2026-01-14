# Trucking Management System - Firebase Edition

This application has been migrated from MySQL to Firebase Firestore for better scalability, real-time capabilities, and easier deployment.

## Migration Overview

The following components have been migrated:

1. Database: MySQL to Firestore
2. Authentication: JWT (still used, but with Firestore backend)
3. Data Models: SQL tables to NoSQL collections
4. API: Express routes now use Firebase services

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- NPM or Yarn
- Firebase account
- Firebase CLI (optional, for advanced usage)

### Setup

1. Clone the repository
2. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
3. Generate a new private key from Firebase Console > Project Settings > Service Accounts
4. Create a `.env` file in the server directory using the `.env.example` as a template
5. Fill in your Firebase credentials from the downloaded service account JSON file

### Installation

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

```bash
# Start server
cd server
npm run dev

# Start client (in a new terminal)
cd client
npm start
```

## Firebase Collections

The data is now organized into the following Firestore collections:

- `users`: All user accounts
- `clients`: Client information 
- `drivers`: Driver information
- `operators`: Operator information
- `helpers`: Helper information
- `staffs`: Staff information
- `trucks`: Truck information
- `allocations`: Truck allocation records
- `deliveries`: Delivery records

## Migration Process

If you need to migrate your existing MySQL data to Firebase, follow these steps:

1. Ensure your `.env` file has both MySQL and Firebase configurations
2. Run the migration script:

```bash
cd server
npm run migrate
```

This will transfer all your existing MySQL data to Firestore in the appropriate collections.

## Key Changes

### Authentication

Authentication still uses JWT tokens, but user data is now stored in Firestore.

### Data Queries

1. SQL queries have been replaced with Firestore queries
2. Transaction support is implemented for operations that require atomicity
3. References between collections use document IDs

### API Endpoints

All API endpoints remain the same, but the underlying logic now uses Firebase.

## Benefits of Firebase

1. Real-time data synchronization
2. Serverless architecture option
3. Built-in authentication (optional future enhancement)
4. Automatic scaling
5. Simplified deployment
6. Reduced database administration overhead

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Express.js Documentation](https://expressjs.com/)
- For detailed migration guide, see the `FIREBASE_MIGRATION_GUIDE.md` file 