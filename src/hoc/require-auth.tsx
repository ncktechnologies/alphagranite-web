"use client";

import { type ReactNode, useEffect } from "react";
// import { ROUTES } from "@/constants/routes";
import { useNavigate } from "react-router-dom";
// import { LogoLoader } from "@/common/loader/logo-loader";
import { ScreenLoader } from "@/components/common/screen-loader";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
    const token = typeof window === "object" && localStorage.getItem("token");
    const router = useNavigate();

    useEffect(() => {
        if (!token) {
            router(`/auth/signin?next=${encodeURIComponent(location.pathname)}`); // Redirect to login page if not authenticated
        }
    }, [token, router]);

    if (!token) return <ScreenLoader />; // Prevents rendering protected content before redirect

    return children;
};
