import type { RouteObject } from 'react-router-dom';
import { BrandedLayout } from './layouts/branded';
import { ChangePasswordPage } from './pages/change-password-page';
import { CheckEmail } from './pages/extended/check-email';
import { ResetPasswordChanged } from './pages/extended/reset-password-changed';
import { ResetPasswordCheckEmail } from './pages/extended/reset-password-check-email';
import { TwoFactorAuth } from './pages/extended/tfa';
import { ResetPasswordPage } from './pages/reset-password-page';
import { SignInPage } from './pages/signin-page';
import { SignUpPage } from './pages/signup-page';
import { ClassicLayout } from './layouts/classic';
import { OtpVerifyPage } from './pages/otp-verify';
import LoginStepper from './pages/steppers/login-stepper';
import { CompleteProfilePage } from './pages/profile-settings/profilepage';

// Define the auth routes
export const authRoutes: RouteObject[] = [
  {
    path: '',
    element: <BrandedLayout />,
    children: [
      {
        path: 'signin',
        element: <SignInPage />,
      },
      {
        path: 'signup',
        element: <SignUpPage />,
      },
      // {
      //   path: 'change-password',
      //   element: <ChangePasswordPage />,
      // },
      // {
      //   path: 'reset-password',
      //   element: <ResetPasswordPage />,
      // },
      /* Extended examples */
      // {
      //   path: '2fa',
      //   element: <TwoFactorAuth />,
      // },
      // {
      //   path: 'check-email',
      //   element: <CheckEmail />,
      // },
      // {
      //   path: 'reset-password/check-email',
      //   element: <ResetPasswordCheckEmail />,
      // },
      // {
      //   path: 'reset-password/changed',
      //   element: <ResetPasswordChanged />,
      // },
    ],
  },
  {
    path: '',
    element: <ClassicLayout />,
    children: [
      
      {
        path: 'reset-password',
        element: <ChangePasswordPage />,
      },
      {
        path: 'forgot-password',
        element: <ResetPasswordPage />,
        // element: <LoginStepper/>,

      },
      {
        path: 'update-profile',
        // element: <ResetPasswordPage />,
        element: <CompleteProfilePage/>,

      },
      {
        path: 'otp-verify',
        element: <OtpVerifyPage/>,
      },
      /* Extended examples */
      {
        path: 'classic/2fa',
        element: <TwoFactorAuth />,
      },
      {
        path: 'classic/check-email',
        element: <CheckEmail />,
      },
      {
        path: 'classic/reset-password/check-email',
        element: <ResetPasswordCheckEmail />,
      },
      {
        path: 'classic/reset-password/changed',
        element: <ResetPasswordChanged />,
      },
    ],
  },
 
];