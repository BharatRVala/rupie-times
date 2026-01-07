import { Suspense } from "react";
import ApplicationPage from "./ApplicationPage";

export const metadata = {
    title: "Apply Now | Rupie Times Careers",
    description: "Submit your application to join our team.",
};

export default function Apply() {
    return (
        <div className="min-h-screen bg-white">
            <Suspense fallback={<div className="min-h-screen bg-white"></div>}>
                <ApplicationPage />
            </Suspense>
        </div>
    );
}
