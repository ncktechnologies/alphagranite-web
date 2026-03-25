import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useLazyGetProfileQuery } from '@/store/api/auth';
import { setCredentials } from '@/store/slice';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

interface FirstTimeLoginResponse {
  success: boolean;
  message: string;
  data: {
    first_time: boolean;
    access_token: string;
    token_type: string;
  };
}

export const useFirstTimeLogin = () => {
  const [login] = useLoginMutation();
  // ✅ Always fetch profile after login so roles/permissions are complete
  const [getProfile] = useLazyGetProfileQuery();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleFirstTimeLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await login({ username, password }).unwrap() as FirstTimeLoginResponse;

      // ── First-time login ───────────────────────────────────────────────────
      if (res?.data?.first_time) {
        localStorage.setItem('token', res.data.access_token);
        return { isFirstTime: true, accessToken: res.data.access_token };
      }

      // ── Regular login ──────────────────────────────────────────────────────
      // 1. Store token first so the profile request is authenticated
      localStorage.setItem('token', res.data.access_token);

      // ✅ 2. Fetch the full profile — includes complete roles[] and permissions
      //       so the dashboard role check is accurate on the very first render
      const profileData = await getProfile().unwrap();

      // ✅ 3. Dispatch profile data (not the login response user object)
      dispatch(
        setCredentials({
          admin: profileData,
          access_token: res.data.access_token,
          permissions: profileData?.action_permissions || profileData?.permissions || [],
        })
      );

      toast.success('User login successfully');
      navigate('/');
      return { isFirstTime: false };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { handleFirstTimeLogin, isLoading };
};