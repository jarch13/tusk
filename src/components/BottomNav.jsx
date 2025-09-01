// src/components/BottomNav.jsx
import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const base = "flex flex-col items-center text-xs";
  const active = "text-blue-600 dark:text-blue-400";
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 backdrop-blur
                 dark:bg-gray-800/90 dark:border-gray-700 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-3 max-w-4xl mx-auto">
        <li>
          <NavLink
            to="/marketplace"
            className={({ isActive }) =>
              `${base} py-2 ${isActive ? active : "text-gray-500 dark:text-gray-300"}`
            }
          >
            <span className="text-lg">🛒</span>
            <span>Market</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/confessions"
            className={({ isActive }) =>
              `${base} py-2 ${isActive ? active : "text-gray-500 dark:text-gray-300"}`
            }
          >
            <span className="text-lg">🗣️</span>
            <span>Confess</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${base} py-2 ${isActive ? active : "text-gray-500 dark:text-gray-300"}`
            }
          >
            <span className="text-lg">👤</span>
            <span>Profile</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
