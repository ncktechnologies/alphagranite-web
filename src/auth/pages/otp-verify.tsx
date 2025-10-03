import { FormHeader } from "@/components/ui/form-header";
import { useEffect, useRef, useState } from 'react';
import { MoveLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { n } from "node_modules/react-router/dist/development/index-react-server-client-2EDmGlsZ.d.mts";

export function OtpVerifyPage() {
    const OTP_LENGTH = 6;
    const SPLIT_INDEX = 3; // Show hyphen after 3 digits

    const [codeInputs, setCodeInputs] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState<number>(60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRefs = useRef<HTMLInputElement[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;
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

        // If all digits are filled, auto-submit
        // const allFilled = updatedInputs.every((digit) => digit !== '');
        // if (allFilled) handleSubmit(updatedInputs.join(''));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
            const prev = inputRefs.current[index - 1];
            if (prev) prev.focus();
        }
    };

    const handleSubmit = async (otp: string) => {
        setIsSubmitting(true);
        try {
            console.log('Submitting OTP:', otp);
            // Simulate async submit
            await new Promise((res) => setTimeout(res, 1000));
            // Redirect or show success
            toast.success(`OTP Verified: ${otp}`);
            navigate('/auth/reset-password');
        } catch (error) {
            console.error('OTP Error', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = () => {
        setCodeInputs(Array(OTP_LENGTH).fill(''));
        setTimer(60);
        inputRefs.current[0]?.focus();
        // Trigger resend logic here (e.g., API call)
    };
    return (
        <div className="w-full flex flex-col items-center justify-center">
            <FormHeader title="Verify OTP" caption={`Enter the code sent to your email address ${email} to verify password reset`} />
            {/* Form content goes here */}
            <Card className="w-full max-w-[398px] overflow-y-auto flex flex-wrap border-[#DFDFDF]">
                <CardContent className="px-6 py-12">
                    <h4 className="text-secondary text-[16px] pb-3">Verification code</h4>
                    <div className="flex justify-center gap-2">
                        {codeInputs.map((value, index) => (
                            <div key={index} className="">
                                <Input
                                    ref={(el) => (inputRefs.current[index] = el!)}
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

                </CardContent>
            </Card>

        </div>
    )
}