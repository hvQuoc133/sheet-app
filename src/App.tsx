/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { Loader2 } from "lucide-react";
import Home from "./pages/Home";
import DocumentEditor from "./pages/DocumentEditor";
import Login from "./pages/Login";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/d/:docId" element={<DocumentEditor />} />
      </Routes>
    </BrowserRouter>
  );
}
