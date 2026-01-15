import { FormHeader } from "@/components/ui/form-header";
import { useEffect, useRef, useState } from 'react';
import { MoveLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useResetPasswordMutation } from '@/store/api/auth';

export function OtpVerifyPage() {
    const OTP_LENGTH = 6;
    const SPLIT_INDEX = 3; // Show hyphen after 3 digits

    const [codeInputs, setCodeInputs] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState<number>(60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username || location.state?.email;
    const from = location.state?.from;
    const [resetPassword] = useResetPasswordMutation();

    // Countdown timer
    useEffect(() => {
        if (timer <= 0) return;
        const interval = setInterval(() => setTimer((t) => t - 1), 1000);
        return () => clearInterval(interval);
    }, [timer]);

    // Autofocus next on change
    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return; // Only allow one digit

        const updatedInputs = [...codeInputs];
        updatedInputs[index] = value;
        setCodeInputs(updatedInputs);

        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
            const prev = inputRefs.current[index - 1];
            if (prev) prev.focus();
        }
    };

    // Function to extract error message from API response
    const getErrorMessage = (error: any): string => {
        if (error?.data?.detail) {
            if (Array.isArray(error.data.detail)) {
                // Handle array of validation errors
                return error.data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
            } else if (typeof error.data.detail === 'string') {
                // Handle string error message
                return error.data.detail;
            } else {
                // Handle object error message
                return error.data.detail.msg || JSON.stringify(error.data.detail);
            }
        }
        return error?.message || 'Invalid verification code';
    };

    const handleSubmit = async (otp: string) => {
        setIsSubmitting(true);
        try {
            console.log('Submitting OTP:', otp);
            
            // For password reset flow, navigate to change password page
            if (from === 'reset-password' && username) {
                // Navigate to change password page with OTP and username
                navigate('/auth/change-password', { 
                    state: { 
                        otp: otp,
                        username: username,
                        from: 'reset-password'
                    } 
                });
            } else {
                // For other flows, just simulate verification
                await new Promise((res) => setTimeout(res, 1000));
                toast.success(`OTP Verified: ${otp}`);
                navigate('/auth/reset-password')
            }
        } catch (error: any) {
            console.error('OTP Error', error);
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = () => {
        setCodeInputs(Array(OTP_LENGTH).fill(''));
        setTimer(60);
        inputRefs.current[0]?.focus();
        // Trigger resend logic here (e.g., API call)
        toast.info('Verification code resent to your email');
    };
    
    return (
        <div className="w-full flex flex-col items-center justify-center">
            <FormHeader title="Verify OTP" caption={`Enter the code sent to ${username} to verify password reset`} />
            {/* Form content goes here */}
            <Card className="w-full max-w-[398px] overflow-y-auto flex flex-wrap border-[#DFDFDF]">
                <CardContent className="px-6 py-12">
                    <h4 className="text-secondary text-[16px] pb-3">Verification code</h4>
                    <div className="flex justify-center gap-2">
                        {codeInputs.map((value, index) => (
                            <div key={index} className="">
                                <Input
                                    ref={(el) => {if (el) inputRefs.current[index] = el;}}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={value}
                                    className="w-[48px] h-[48px] text-center text-lg font-medium rounded-[8px]"
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    placeholder="-"
                                />
                                {/* {index === SPLIT_INDEX - 1 && (
                                    <div className="mx-4 w-2 h-6 bg-primary self-center" />
                                )} */}


                            </div>
                        ))}
                    </div>
                    <Button
                        className="w-full my-8"
                        disabled={codeInputs.includes('') || isSubmitting}
                        onClick={() => handleSubmit(codeInputs.join(''))}
                    // loading={isSubmitting}
                    >
                        Verify OTP
                    </Button>
                    <div className="flex items-center justify-center text-sm text-foreground gap-1.5">
                        <span>Didn’t receive a code?</span>
                        <button
                            onClick={handleResend}
                            className=" text-primary underline transition-colors"
                        >
                            Resend Now
                        </button>

                    </div>
                    <div className="flex items-center text-center justify-center">{timer}s</div>
                    
                    <div className="text-center text-sm mt-4">
                        <Link
                            to="/auth/signin"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground hover:underline hover:underline-offset-2"
                        >
                            <MoveLeft className="size-3.5 opacity-70" /> Back to Sign In
                        </Link>
                    </div>

                </CardContent>
            </Card>

        </div>
    )
}