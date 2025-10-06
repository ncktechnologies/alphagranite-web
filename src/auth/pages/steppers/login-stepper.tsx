import {
    Stepper,
    StepperNav,
    StepperItem,
    StepperTrigger,
    StepperIndicator,
    StepperTitle,
    StepperContent,
} from '@/components/ui/stepper';
import { OtpVerifyPage } from '../otp-verify';
import { ChangePasswordPage } from '../change-password-page';

export default function LoginStepper() {
    const steps = [
        { title: 'Verify OTP', step: 1 },
        { title: 'Set New Password', step: 2 },
    ];

    return (
        <div className=" flex items-center justify-center ">
            <div className="w-full max-w-5xl mx-auto flex justify-center ">
                <Stepper defaultValue={1} orientation="vertical" className="w-full max-w-md">
                    <StepperNav className="hidden md:flex absolute left-3 lg:left-1/12 xl:left-1/6 2xl:left-1/6 ultra:left-1/3 top-1/2 -translate-y-1/2 space-y-6 w-48">
                        {steps.map(({ title, step }) => (
                            <StepperItem key={step} step={step}>
                                <StepperTrigger className="flex items-center gap-2 w-full justify-start">
                                    <StepperIndicator>{step}</StepperIndicator>
                                    <StepperTitle>{title}</StepperTitle>
                                </StepperTrigger>
                            </StepperItem>
                        ))}
                    </StepperNav>
                    <StepperContent value={1}>
                        <OtpVerifyPage />
                    </StepperContent>
                    <StepperContent value={2}>
                        <ChangePasswordPage />
                    </StepperContent>
                </Stepper>
            </div>

        </div>
    );
}
