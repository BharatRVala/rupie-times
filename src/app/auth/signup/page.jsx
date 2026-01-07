
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AuthForm from "@/app/components/AuthForm";

export const metadata = {
    title: "Sign Up | Rupie Times",
    description: "Create an account to access Rupie Times features.",
};

export default async function SignupPage() {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token');

    if (userToken) {
        redirect('/user-dashboard');
    }

    return <AuthForm initialTab="signup" />;
}
