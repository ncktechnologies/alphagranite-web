export interface AuthUser {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  status: number;
  credit: string;
  created_at: string;
  last_login: string;
  profile_pic: string;
  source: string;
  app_version: string;
  location: string;
  comments: string;
}

export interface AuthOrder {
  id: string;
  delivery_distance: number;
  delivery_type: string;
  delivery_fee: number;
  payment_method: string;
  status: string;
  created_at: string;
  order_number: string;
  sender_name: string;
  sender_address: string;
  sender_phone: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  recipient_landmark: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_latitude: number;
  delivery_longitude: number;
  photo_confirmation_url: string;
  user_id: string;
  rider_id: string;
  comments: string;
}

export interface AuthRider {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_pic: string;
  current_latitude: string;
  current_longitude: string;
  created_at: string;
}

export interface AuthNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

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
  };
}

export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  username:string;
  phone: string;
  date_of_birth: string; // or Date, depending on how you use it
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  church_id: string | number; // adjust based on your backend
  role: string;
  pin: string
}
export interface SignupResponse {
  admin: SignupRequest;
  
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
  // Add other profile fields as needed
}

export interface UserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  is_superuser: boolean;
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
