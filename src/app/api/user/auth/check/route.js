import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is missing in environment variables");
      return NextResponse.json({ success: false, error: "Configuration Error" }, { status: 500 });
    }

    const cookieStore = req.cookies;
    const token = cookieStore.get('user_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        isLoggedIn: false,
        message: "No authentication token found"
      });
    }

    // Verify the token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (!decoded) {
        throw new Error("Decoding failed");
      }

      return NextResponse.json({
        success: true,
        isLoggedIn: true,
        user: {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role
        }
      });
    } catch (jwtError) {
      // Token invalid or expired
      return NextResponse.json({
        success: false,
        isLoggedIn: false,
        message: "Invalid or expired token"
      });
    }

  } catch (error) {
    console.error("Auth check error:", error.message);

    return NextResponse.json({
      success: false,
      isLoggedIn: false,
      message: "Server error"
    }, { status: 500 });
  }
}