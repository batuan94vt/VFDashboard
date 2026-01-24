import React from "react";

const NavItem = ({ id, label, icon, active, onClick }) => {
  const handleClick = (id) => {
    // Haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    onClick(id);
  };

  return (
    <button
      onClick={() => handleClick(id)}
      className={`relative flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 rounded-full z-10 group ${active ? "text-blue-500" : "text-gray-400 hover:text-gray-200"}`}
    >
      {/* Active Background Glow */}
      <div
        className={`absolute inset-1 transition-all duration-300 rounded-full ${active ? "bg-white/10 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)] opacity-100" : "opacity-0"}`}
      ></div>

      <div
        className={`relative transition-all duration-300 ${active ? "scale-110 -translate-y-1" : "translate-y-0 group-hover:-translate-y-0.5"}`}
      >
        {React.cloneElement(icon, {
          className: `w-6 h-6 transition-all duration-300 ${active ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-gray-400 group-hover:text-gray-300"}`,
        })}
      </div>
      <span
        className={`absolute bottom-2 text-[10px] font-medium uppercase tracking-wider transition-all duration-300 ${active ? "opacity-100 translate-y-0 text-blue-100" : "opacity-0 translate-y-2"}`}
      >
        {label}
      </span>
    </button>
  );
};

export default function MobileNav({ activeTab, onTabChange, onScan }) {
  const handleScan = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
    onScan();
  };

  const tabs = [
    {
      id: "vehicle",
      label: "Car",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H12c-.6 0-1.2.2-1.7.5L8 9.9S5.3 10.6 3.5 11.1c-.8.2-1.5 1-1.5 1.9v3c0 .6.4 1 1 1h2" />
          <path d="M5 17h14v-1.9c0-.6-.4-1.1-1-1.1H6c-.6 0-1 .5-1 1.1V17z" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      ),
    },
    {
      id: "energy_env",
      label: "Energy",
      icon: (
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      id: "status",
      label: "Health",
      icon: (
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: "location",
      label: "Map",
      icon: (
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col justify-end pb-[env(safe-area-inset-bottom,20px)] pt-4 px-4 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none">
      <div className="flex justify-center items-center gap-4 pointer-events-auto mb-2">
        {/* Main Nav Pill */}
        <div className="flex-1 max-w-xs flex items-center bg-gray-800/80 backdrop-blur-xl border border-white/10 rounded-2xl h-16 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ring-1 ring-white/5 overflow-hidden">
          {tabs.map((tab) => (
            <NavItem
              key={tab.id}
              {...tab}
              active={activeTab === tab.id}
              onClick={onTabChange}
            />
          ))}
        </div>

        {/* Scan Button (Floating) */}
        <button
          onClick={handleScan}
          className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-blue-600/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-95 transition-all duration-300 group hover:bg-blue-500"
          title="Full Scan"
        >
          <svg
            className="w-8 h-8 text-white group-hover:rotate-180 transition-transform duration-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
