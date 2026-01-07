// src/app/auth/page.jsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AuthForm from "@/app/components/AuthForm";

export const metadata = {
    title: "Authentication | Rupie Times",
    description: "Sign in or create an account to access Rupie Times features.",
};

export default async function AuthPage() {
    // Check if user is already logged in
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');
    
    // If user is already logged in, redirect to home page
    if (userToken) {
        redirect('/user-dashboard');
    }
    
    return <AuthForm />;
}