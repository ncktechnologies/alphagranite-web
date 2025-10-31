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
  const [getProfile] = useLazyGetProfileQuery();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleFirstTimeLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await login({ username, password }).unwrap() as FirstTimeLoginResponse;
      
      // Check if it's a first-time login
      if (res?.data?.first_time) {
        // Store the token for the change password flow
        localStorage.setItem('token', res.data.access_token);
        // Return indicator for popup instead of showing toast
        return { isFirstTime: true, accessToken: res.data.access_token };
      }
      
      // Regular login flow
      toast.success("User login successfully");
      localStorage.setItem('token', res.data.access_token);
      const profileData = await getProfile().unwrap();
      dispatch(
        setCredentials({
          admin: profileData,
          access_token: res.data.access_token,
        })
      );
      
      // Redirect to dashboard
      navigate('/dashboard');
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