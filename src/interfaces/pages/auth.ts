

export interface AuthAdmin {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string;
}

export interface AuthResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  limit: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Permission structure
export interface MenuPermission {
  menu_id: number;
  menu_name: string;
  menu_code: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

// Updated LoginResponse to handle both regular and first-time login responses
export interface LoginResponse {
  // Regular login properties
  admin?: AuthAdmin;
  access_token?: string;
  refresh_token?: string;
  // First-time login properties
  success?: boolean;
  message?: string;
  data?: {
    first_time: boolean;
    access_token: string;
    token_type: string;
    refresh_token?: string;
    user?: any;
    permissions?: MenuPermission[];
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface SendOtpRequest {
  email: string;
}

export interface UpdateProfileRequest {
  fname?: string;
  lname?: string;
  email?: string;
  phone?: string;
  profile_pic?: string;
}

export interface InviteUsersRequest {
  emails: string[];
  role?: string;
} 

// Adding missing interfaces based on OpenAPI spec

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department_id?: number;
  department?: number;
  gender?: string;
  profile_image_id?: number;
  profile_image_url?: string;
  // Add other profile fields as needed
}

export interface UserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  gender?: string;
  department?: number;
  department_id?: number;
  is_active: boolean;
  is_superuser: boolean;
  role_id?: number | null;
  is_super_admin?: boolean;
  username?: string;
  permissions?: MenuPermission[];
  // Add other user fields as needed
}

export interface HTTPValidationError {
  detail?: Array<ValidationError>;
}

export interface ValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
}
