import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Lock, KeyRound, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to home
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/");
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const emailField = `${username}@2bt.com`;
      await signInWithEmailAndPassword(auth, emailField, password);
      // navigation handled by onAuthStateChanged
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setLoginError("Invalid username or password.");
      } else {
        setLoginError("An error occurred: " + err.message);
      }
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // navigation handled by onAuthStateChanged
    } catch (err: any) {
      console.error(err);
      setLoginError("Error logging in with Google.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>
        
        <h1 className="text-xl font-bold text-gray-900 mb-2">Log in</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Please log in to store and manage your campaigns.
        </p>

        {loginError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg text-left border border-red-100">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3 mb-6">
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">Username (Provided by Admin)</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              placeholder="Username"
            />
          </div>
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Log in
          </button>
        </form>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">For Admin</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="w-full flex justify-center items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 text-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 block" alt="Google" />
          Log in with Google
        </button>
      </div>
    </div>
  );
}
