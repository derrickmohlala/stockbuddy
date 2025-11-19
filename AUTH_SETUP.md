# Authentication & Admin Setup Guide

This guide will help you set up authentication and admin capabilities for StockBuddy.

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- Flask-JWT-Extended (for JWT authentication)
- Werkzeug (for password hashing)

### 2. Run Database Migration

To add the new authentication fields to your existing database:

```bash
cd backend
python migrate_auth.py
```

This adds:
- `email` column (for login)
- `password_hash` column (for secure password storage)
- `is_admin` column (for admin privileges)

### 3. Create an Admin User

Create your first admin user:

```bash
cd backend
python create_admin.py <email> <password> <first_name>
```

Example:
```bash
python create_admin.py admin@stockbuddy.com admin123 Admin
```

### 4. Set JWT Secret Key (Production)

For production, set a secure JWT secret key:

```bash
export JWT_SECRET_KEY="your-super-secret-key-here"
```

Or add it to a `.env` file in the backend directory:
```
JWT_SECRET_KEY=your-super-secret-key-here
```

## Frontend Setup

The frontend authentication is already integrated. Users can:

1. **Sign up** at `/signup` to create a new account
2. **Login** at `/login` with email and password
3. **Access admin dashboard** at `/admin` (if admin privileges)

## Features

### Authentication
- ✅ User registration with email/password
- ✅ User login with JWT tokens
- ✅ Protected routes (admin endpoints require authentication)
- ✅ Auto token refresh
- ✅ Logout functionality

### Admin Dashboard
- ✅ View all users in a searchable table
- ✅ Pagination support (50 users per page)
- ✅ Search by email or name
- ✅ Display user details:
  - User ID
  - Email
  - Name
  - Admin status
  - Onboarding status
  - Investment preferences (goal, risk, etc.)
  - Creation date

### Navigation Updates
- ✅ Login/Signup links shown when not authenticated
- ✅ User name and logout button shown when authenticated
- ✅ Admin link shown for admin users
- ✅ Mobile-responsive menu with auth state

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/current` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout (requires auth)

### Admin
- `GET /api/admin/users?page=1&per_page=50&search=query` - Get all users (requires admin)

## Notes

- Existing users (created before auth) can still use the app but won't have email/password login
- New users must sign up with email/password
- Admin users can view all user data in the admin dashboard
- All API requests automatically include JWT token in Authorization header

