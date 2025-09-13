// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import Login from "./Login";
import Marketplace from "./pages/Marketplace";
import ConfessionsList from './pages/ConfessionsList';
import ConfessionDetail from "./pages/ConfessionDetail";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import RequireAdmin from "./pages/RequireAdmin";
import BottomNav from "./components/BottomNav"; // make sure this file exists (from earlier snippet)

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light"); // 'light' | 'dark'

  // Auth bootstrap
  useEffect(() => {
    const hasTokens =
      window.location.hash.includes("access_token") ||
      window.location.hash.includes("refresh_token") ||
      window.location.search.includes("code=");

    if (hasTokens && supabase.auth.getSessionFromUrl) {
      supabase.auth
        .getSessionFromUrl({ storeSession: true })
        .then(({ data, error }) => {
          if (error) console.error("getSessionFromUrl error:", error.message);
          if (data?.session) setSession(data.session);
          window.history.replaceState({}, document.title, "/");
        });
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null);
    });

    return () => sub?.subscription?.unsubscribe();
  }, []);

  // Ensure a profiles row exists for marketplace
  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .upsert({ id: session.user.id }, { onConflict: "id" })
      .then(({ error }) => {
        if (error) console.error("profiles upsert error:", error.message);
      });
  }, [session]);

  // Theme load + persist
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(saved ?? (systemDark ? "dark" : "light"));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center dark:bg-gray-900 dark:text-gray-100">
        <span className="text-gray-500 dark:text-gray-300">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
        <Login />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
        {/* Top header (hidden on mobile; bottom tabs appear there instead) */}
        <header className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="max-w-4xl mx-auto p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-xl font-bold tracking-tight">
                <Link to="/" classname="hover:opacity-80 focus:outline-none focus-visible:ring">
                Tusk
                </Link>
              </div>
              <nav className="hidden md:flex gap-3">
                <NavLink
                  to="/marketplace"
                  className={({ isActive }) =>
                    `px-3 py-1 rounded ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                >
                  Marketplace
                </NavLink>
                <NavLink
                  to="/confessions"
                  className={({ isActive }) =>
                    `px-3 py-1 rounded ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                >
                  Confessions
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `px-3 py-1 rounded ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                >
                  Profile
                </NavLink>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className="px-2 py-1 rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Toggle theme"
              >
                {theme === "dark" ? "🌞" : "🌙"}
              </button>
              <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">
                {session.user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-3 py-1 rounded bg-gray-900 text-white hover:bg-gray-800"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Main content; add padding-bottom so content doesn't hide under mobile tabs */}
        <main className="max-w-4xl mx-auto p-4 pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/marketplace" element={<Marketplace user={session.user} />} />
            <Route path="/confessions" element={<ConfessionsList session={session} />} />
            <Route path="/confessions/:id" element={<ConfessionDetail session={session} />} />
            <Route path="/profile" element={<Profile user={session.user} />} />
            <Route path="/admin" element={<Admin session={session} />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin session={session}>
                  <Admin session={session} />
                </RequireAdmin>
              }
            />
          </Routes>
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
