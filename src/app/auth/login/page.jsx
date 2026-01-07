
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AuthForm from "@/app/components/AuthForm";

export const metadata = {
    title: "Login | Rupie Times",
    description: "Sign in to access Rupie Times features.",
};

export default async function LoginPage() {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');

    if (userToken) {
        redirect('/user-dashboard');
    }

    return <AuthForm initialTab="login" />;
}
