// ============================================================
// SELLER LOGIN PAGE
// URL: /seller/login
// STRICT: Email + Password ONLY, NO OTP
// ============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SellerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSellerStatus(null);

    try {
      const response = await fetch("/api/seller/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // SUCCESS: Redirect to seller dashboard
        router.push("/seller");
        router.refresh();
      } else {
        // ERROR: Show error message
        setError(data.error || "Login failed");
        if (data.sellerStatus) {
          setSellerStatus(data.sellerStatus);
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Seller Login</h2>
          <p className="mt-2 text-center text-gray-600">
            Access your seller dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            {sellerStatus === "PENDING" && (
              <p className="mt-2 text-sm">
                Your account is pending approval. Please wait for admin verification.
              </p>
            )}
            {sellerStatus === "REJECTED" && (
              <p className="mt-2 text-sm">
                Your application was rejected. Please contact support.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum 10 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center space-y-2">
          <Link href="/login" className="text-sm text-blue-600 hover:underline block">
            ← Back to User Login
          </Link>
          <Link href="/admin/login" className="text-sm text-gray-500 hover:underline block">
            Admin Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
