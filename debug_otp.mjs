
import { sendOTPEmail } from './src/app/lib/utils/resend.js';

// Mock DB or just test the email part?
// The syntax error likely comes from resend.js execution.

async function testOTP() {
    try {
        console.log("Attempting to send OTP email...");
        const result = await sendOTPEmail("test@example.com", "123456", "Test User");
        console.log("Result:", result);
    } catch (error) {
        console.error("❌ Error sending OTP:", error);
    }
}

testOTP();
