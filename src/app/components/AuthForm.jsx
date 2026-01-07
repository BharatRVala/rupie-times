// src/app/components/AuthForm.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "../context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";

import logo from "../assets/logo.svg";
import GlobalLoader from "./GlobalLoader";

export default function AuthForm({ initialTab = "login" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [authFlow, setAuthFlow] = useState("main"); // 'main', 'forgot', 'verify', 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Remove local isLoggedIn state, use context
  const { isLoggedIn, checkAuthStatus } = useAuthContext();
  const [timer, setTimer] = useState(600); // 10 minutes for OTP
  const [canResendOTP, setCanResendOTP] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/user-dashboard';
  const otpInputRefs = useRef([]);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: ""
  });

  // Forgot password state
  const [forgotData, setForgotData] = useState({
    email: ""
  });

  // OTP verification state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  // Reset password state
  const [resetData, setResetData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    // Check auth status on mount using context
    checkAuthStatus();

    // Check for saved login data
    const savedEmail = localStorage.getItem("rupietimes_email");
    const savedRemember = localStorage.getItem("rupietimes_remember") === "true";

    if (savedRemember && savedEmail) {
      setLoginData(prev => ({
        ...prev,
        email: savedEmail,
        rememberMe: true
      }));
    }
  }, []); // Remove router dependency to avoid verify loops

  // Redirect if logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push(redirectUrl);
    }
  }, [isLoggedIn, router, redirectUrl]);

  // OTP Timer
  useEffect(() => {
    let interval;
    if (authFlow === 'verify' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResendOTP(true);
    }
    return () => clearInterval(interval);
  }, [authFlow, timer]);

  // Toggle between Login and Signup
  const toggleTab = (tab) => {
    setActiveTab(tab);
    setAuthFlow("main");
    setError("");
    setMessage("");
  };

  // Back to main auth
  const handleBackToMain = () => {
    setAuthFlow("main");
    setError("");
    setMessage("");
    setForgotData({ email: "" });
    setOtp(['', '', '', '', '', '']);
    setResetData({ newPassword: "", confirmPassword: "" });
  };

  // Handle login input changes
  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (error) setError("");
  };

  // Handle signup input changes
  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  // Handle forgot password input change
  const handleForgotChange = (e) => {
    const { name, value } = e.target;
    setForgotData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle OTP key down
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, index) => {
        if (index < 6) newOtp[index] = digit;
      });
      setOtp(newOtp);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Handle reset password input change
  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  // REMOVED: Validate password strength function
  // REMOVED: Get password strength indicator function

  // Format time for OTP timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/user/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginData.email, password: loginData.password }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        // Save to localStorage if remember me is checked
        if (loginData.rememberMe) {
          localStorage.setItem("rupietimes_email", loginData.email);
          localStorage.setItem("rupietimes_remember", "true");
        } else {
          localStorage.removeItem("rupietimes_email");
          localStorage.removeItem("rupietimes_remember");
        }

        // setMessage("Login successful! Redirecting..."); // REMOVED: User wants no popup, just loader
        await checkAuthStatus(); // Update global auth state immediately

        // Keep loading true until redirect completes

        router.push(redirectUrl);
        router.refresh();
      } else {
        setLoading(false); // Only set loading false on error
        setError(result.message || "Invalid email or password");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  // Handle signup submission
  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    // SIMPLIFIED VALIDATION: Only check if passwords match
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // REMOVED: Password strength validation

    setLoading(true);
    setError("");

    try {
      const { confirmPassword, ...submitData } = signupData;

      const response = await fetch('/api/user/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Registration successful! Auto-logging in...");

        // Auto login after successful registration
        setTimeout(async () => {
          try {
            const loginResponse = await fetch('/api/user/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: signupData.email,
                password: signupData.password
              }),
              credentials: 'include'
            });

            const loginResult = await loginResponse.json();
            if (loginResult.success) {
              await checkAuthStatus(); // Update global auth state
              router.push(redirectUrl);
              router.refresh();
            } else {
              setError("Registration successful but auto-login failed. Please login manually.");
              setAuthFlow("main");
              setActiveTab("login");
            }
          } catch (error) {
            setError("Registration successful but auto-login failed. Please login manually.");
            setAuthFlow("main");
            setActiveTab("login");
          }
        }, 1500);
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password submission
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/user/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotData.email })
      });

      const result = await response.json();

      if (result.success) {
        setMessage("OTP sent to your email! Redirecting to verification...");
        localStorage.setItem('resetEmail', forgotData.email);

        if (result.data?.token) {
          localStorage.setItem('resetToken', result.data.token);
        }

        setTimer(600);
        setCanResendOTP(false);

        setTimeout(() => {
          setAuthFlow("verify");
        }, 1000);
      } else {
        setError(result.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const email = localStorage.getItem('resetEmail');
      const token = localStorage.getItem('resetToken');

      const response = await fetch('/api/user/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString, token })
      });

      const result = await response.json();

      if (result.success) {
        setMessage("OTP verified successfully! Redirecting to password reset...");

        if (result.data?.token) {
          localStorage.setItem('resetToken', result.data.token);
        }

        setTimeout(() => {
          setAuthFlow("reset");
        }, 1000);
      } else {
        setError(result.message);
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!canResendOTP) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const email = localStorage.getItem('resetEmail');

      const response = await fetch('/api/user/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (result.success) {
        setTimer(600);
        setCanResendOTP(false);
        setMessage('New OTP sent successfully!');
        setOtp(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();

        if (result.data?.token) {
          localStorage.setItem('resetToken', result.data.token);
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // REMOVED: Password strength validation

    setLoading(true);
    setError('');

    try {
      const email = localStorage.getItem('resetEmail');
      const token = localStorage.getItem('resetToken');

      const response = await fetch('/api/user/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          newPassword: resetData.newPassword,
          confirmPassword: resetData.confirmPassword
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Password reset successfully! Redirecting to login...');

        // Clear stored data
        localStorage.removeItem('resetEmail');
        localStorage.removeItem('resetToken');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          setAuthFlow("main");
          setActiveTab("login");
          setResetData({ newPassword: "", confirmPassword: "" });
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, show loading or redirect message
  if (isLoggedIn) {
    return <GlobalLoader />;
  }

  // Render main content based on auth flow
  const renderContent = () => {
    switch (authFlow) {
      case "forgot":
        return renderForgotPassword();
      case "verify":
        return renderVerifyOTP();
      case "reset":
        return renderResetPassword();
      default:
        return renderMainAuth();
    }
  };

  // Render main auth (login/signup)
  const renderMainAuth = () => (
    <>
      {/* Header Text */}
      <div className="text-center">
        <h2 className="mt-2 text-3xl font-bold text-[#1E4032]">
          {activeTab === "login" ? "Welcome Back" : "Create an account"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {activeTab === "login"
            ? "Let's sign in to your account and get started."
            : "Please enter your details to create an account"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`flex-1 py-4 text-center text-sm font-medium transition-colors duration-200 ${activeTab === "login"
            ? "text-[#C0934B] border-b-2 border-[#C0934B]"
            : "text-gray-500 hover:text-gray-700"
            }`}
          onClick={() => toggleTab("login")}
          disabled={loading}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-4 text-center text-sm font-medium transition-colors duration-200 ${activeTab === "signup"
            ? "text-[#C0934B] border-b-2 border-[#C0934B]"
            : "text-gray-500 hover:text-gray-700"
            }`}
          onClick={() => toggleTab("signup")}
          disabled={loading}
        >
          Sign Up
        </button>
      </div>

      {/* Forms */}
      <div className="mt-8 space-y-6">
        {/* Login View */}
        {activeTab === "login" && (
          <form className="space-y-6" onSubmit={handleLoginSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginData.email}
                  onChange={handleLoginChange}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                  placeholder="Enter Your Email Address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={loginData.password}
                  onChange={handleLoginChange}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                  placeholder="Enter Your Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={loginData.rememberMe}
                  onChange={handleLoginChange}
                  disabled={loading}
                  className="h-4 w-4 accent-[#C0934B] text-[#C0934B] focus:ring-[#C0934B] border-gray-300 rounded disabled:opacity-50"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setAuthFlow("forgot")}
                  disabled={loading}
                  className="font-medium text-gray-900 hover:text-[#C0934B] disabled:opacity-50"
                >
                  Forgot Your Password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#C0934B] hover:bg-[#a37c3f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C0934B] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don't have account yet? </span>
              <button
                type="button"
                onClick={() => toggleTab("signup")}
                disabled={loading}
                className="font-bold text-[#1E4032] hover:text-[#142b22] disabled:opacity-50"
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* Signup View */}
        {activeTab === "signup" && (
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <div>
              <label htmlFor="fullname" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullname"
                  name="name"
                  type="text"
                  required
                  value={signupData.name}
                  onChange={handleSignupChange}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                  placeholder="Enter Your Full Name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="mobile"
                  type="tel"
                  required
                  value={signupData.mobile}
                  onChange={handleSignupChange}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                  placeholder="Enter Your Phone Number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  value={signupData.email}
                  onChange={handleSignupChange}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                  placeholder="Enter Your Email Address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={signupData.password}
                  onChange={handleSignupChange}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                  placeholder="Enter Your Password (minimum 3 characters)"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {/* REMOVED: Password strength indicator */}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={signupData.confirmPassword}
                  onChange={handleSignupChange}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                  placeholder="Confirm Your Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {signupData.confirmPassword && (
                <p className={`mt-1 text-xs ${signupData.password === signupData.confirmPassword ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {signupData.password === signupData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="signup-remember-me"
                name="rememberMe"
                type="checkbox"
                required
                disabled={loading}
                className="h-4 w-4 accent-[#C0934B] text-[#C0934B] focus:ring-[#C0934B] border-gray-300 rounded disabled:opacity-50"
              />
              <label htmlFor="signup-remember-me" className="ml-2 block text-sm text-gray-900">
                I agree to the <Link href="/terms" className="text-[#C0934B] hover:underline">Terms and Conditions</Link> and <Link href="/privacy-policy" className="text-[#C0934B] hover:underline">Privacy Policy</Link>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#C0934B] hover:bg-[#a37c3f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C0934B] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Sign Up'
                )}
              </button>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have account ? </span>
              <button
                type="button"
                onClick={() => toggleTab("login")}
                disabled={loading}
                className="font-bold text-[#1E4032] hover:text-[#142b22] disabled:opacity-50"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );

  // Render forgot password
  const renderForgotPassword = () => (
    <>
      <div className="text-center">
        <h2 className="mt-2 text-3xl font-bold text-[#1E4032]">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email to receive an OTP for password reset
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleForgotSubmit}>
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <div className="mt-1">
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={forgotData.email}
              onChange={handleForgotChange}
              disabled={loading}
              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
              placeholder="Enter Your Email Address"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#C0934B] hover:bg-[#a37c3f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C0934B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending OTP...
              </span>
            ) : (
              'Send OTP'
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleBackToMain}
            disabled={loading}
            className="inline-flex items-center text-sm font-medium text-[#1E4032] hover:text-[#142b22] disabled:opacity-50"
          >
            <FaArrowLeft className="mr-2" /> Back to Sign In
          </button>
        </div>
      </form>
    </>
  );

  // Render verify OTP
  const renderVerifyOTP = () => (
    <>
      <div className="text-center">
        <h2 className="mt-2 text-3xl font-bold text-[#1E4032]">
          Verify OTP
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter the 6-digit OTP sent to your email
        </p>
        <div className="mt-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${timer > 60 ? 'bg-green-100 text-green-800' :
            timer > 30 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
            Expires in: {formatTime(timer)}
          </div>
        </div>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            6-Digit OTP
          </label>
          <div className="flex justify-center space-x-2" onPaste={handleOtpPaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpInputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#C0934B] focus:ring-2 focus:ring-yellow-200 focus:outline-none transition duration-200"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#C0934B] hover:bg-[#a37c3f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C0934B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              'Verify OTP'
            )}
          </button>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setAuthFlow("forgot")}
            className="text-sm text-[#1E4032] hover:text-[#142b22] transition duration-200"
          >
            ← Change Email
          </button>

          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResendOTP || loading}
            className={`text-sm ${canResendOTP ? 'text-[#1E4032] hover:text-[#142b22]' : 'text-gray-400 cursor-not-allowed'} transition duration-200`}
          >
            Resend OTP {!canResendOTP && `(in ${formatTime(timer)})`}
          </button>
        </div>
      </form>
    </>
  );

  // Render reset password
  const renderResetPassword = () => (
    <>
      <div className="text-center">
        <h2 className="mt-2 text-3xl font-bold text-[#1E4032]">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Create a new password for your account
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
        <div className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                required
                value={resetData.newPassword}
                onChange={handleResetChange}
                disabled={loading}
                className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {/* REMOVED: Password strength indicator for reset */}
          </div>

          <div>
            <label htmlFor="reset-confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="mt-1">
              <input
                id="reset-confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={resetData.confirmPassword}
                onChange={handleResetChange}
                disabled={loading}
                className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#C0934B] focus:border-[#C0934B] sm:text-sm disabled:opacity-50"
                placeholder="Confirm new password"
              />
            </div>
            {resetData.newPassword && resetData.confirmPassword && (
              <p className={`mt-1 text-xs ${resetData.newPassword === resetData.confirmPassword ? 'text-green-600' : 'text-red-600'
                }`}>
                {resetData.newPassword === resetData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#C0934B] hover:bg-[#a37c3f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C0934B] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting Password...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleBackToMain}
            disabled={loading}
            className="inline-flex items-center text-sm font-medium text-[#1E4032] hover:text-[#142b22] disabled:opacity-50"
          >
            <FaArrowLeft className="mr-2" /> Back to Login
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className="min-h-screen backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 backdrop-blur supports-[backdrop-filter]:bg-white/10 bg-white/10 p-8 rounded-[20px] shadow-lg border border-gray-200">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src={logo}
            alt="Rupie Times"
            className="h-16 w-auto"
            priority
          />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {message}
          </div>
        )}

        {/* Main Content */}
        {renderContent()}


      </div>
    </div>
  );
}