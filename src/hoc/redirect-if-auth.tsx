import { ScreenLoader } from "@/components/common/screen-loader";
import { type ReactNode, useEffect } from "react"
import { useNavigate } from "react-router-dom";

export const RedirectIfAuth = ({ children }: { children: ReactNode }) => {
    const router = useNavigate();
    const token = typeof window === "object" && localStorage.getItem("token");

    useEffect(() => {
        if (token) {
            router("/");
        }
    }, [token, router]);

    if (token) return <ScreenLoader />; // Prevents rendering protected content before redirect

    return children;
};
