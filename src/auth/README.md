# Auth API Implementation

This document describes the implementation of the Auth API endpoints based on the OpenAPI specification.

## Implemented Endpoints

### 1. Login
- **Endpoint**: `POST /auth/login`
- **RTK Query Hook**: `useLoginMutation`
- **Request Type**: `LoginRequest`
- **Response Type**: `LoginResponse`

### 2. Change Password
- **Endpoint**: `POST /auth/change-password`
- **RTK Query Hook**: `useChangePasswordMutation`
- **Request Type**: `PasswordChangeRequest`

### 3. Request Password Reset
- **Endpoint**: `POST /auth/request-password-reset`
- **RTK Query Hook**: `useRequestPasswordResetMutation`
- **Request Type**: `PasswordResetRequest`

### 4. Reset Password
- **Endpoint**: `POST /auth/reset-password`
- **RTK Query Hook**: `useResetPasswordMutation`
- **Request Type**: `PasswordResetConfirm`

### 5. Unlock Account
- **Endpoint**: `POST /auth/unlock-account/{user_id}`
- **RTK Query Hook**: `useUnlockAccountMutation`
- **Parameter**: `user_id` (number)

### 6. Get User Profile
- **Endpoint**: `GET /auth/me`
- **RTK Query Hook**: `useGetProfileQuery`
- **Response Type**: `UserResponse`

### 7. Update User Profile
- **Endpoint**: `PUT /auth/me`
- **RTK Query Hook**: `useUpdateProfileMutation`
- **Request Type**: `UserProfileUpdate`
- **Response Type**: `UserResponse`

## Data Models

### LoginRequest
```typescript
interface LoginRequest {
  username: string;
  password: string;
}
```

### LoginResponse
```typescript
interface LoginResponse {
  admin: AuthAdmin;
  access_token: string;
  refresh_token: string;
}
```

### PasswordChangeRequest
```typescript
interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
```

### PasswordResetRequest
```typescript
interface PasswordResetRequest {
  email: string;
}
```

### PasswordResetConfirm
```typescript
interface PasswordResetConfirm {
  token: string;
  new_password: string;
}
```

### UserProfileUpdate
```typescript
interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}
```

### UserResponse
```typescript
interface UserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  is_superuser: boolean;
}
```

## Usage Examples

### Login
```typescript
const [login, { isLoading }] = useLoginMutation();

const handleLogin = async (username: string, password: string) => {
  try {
    const result = await login({ username, password }).unwrap();
    // Handle successful login
  } catch (error) {
    // Handle error
  }
};
```

### Change Password
```typescript
const [changePassword, { isLoading }] = useChangePasswordMutation();

const handleChangePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
  try {
    await changePassword({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }).unwrap();
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

### Request Password Reset
```typescript
const [requestPasswordReset, { isLoading }] = useRequestPasswordResetMutation();

const handleRequestPasswordReset = async (email: string) => {
  try {
    await requestPasswordReset({ email }).unwrap();
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

## First-Time Login Flow

When a user logs in for the first time, the system detects the `first_time: true` flag in the login response and shows a popup prompting the user to change their password. The temporary access token is stored and used for the subsequent password change request.

## Pages Implementation

1. **SignInPage** - Uses `useLoginMutation` and `useLazyGetProfileQuery`
2. **ResetPasswordPage** - Uses `useRequestPasswordResetMutation`
3. **ChangePasswordPage** - Uses `useChangePasswordMutation`
4. **OtpVerifyPage** - Uses `useResetPasswordMutation`
5. **ProfileSettingsPage** - Uses `useGetProfileQuery` and `useUpdateProfileMutation`