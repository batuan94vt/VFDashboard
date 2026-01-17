import { useStore } from "@nanostores/react";
import { vehicleStore } from "../stores/vehicleStore";

// Weather Row Component
const WeatherRow = ({ label, value, icon, subValue }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
        {icon}
      </div>
      <div>
        <span className="block text-sm font-bold text-gray-900">{value}</span>
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
    </div>
    <div className="text-right">
      {/* Swapped layout slightly for better hierarchy */}
      {subValue && (
        <span className="block text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
          {subValue}
        </span>
      )}
    </div>
  </div>
);

export default function ControlGrid() {
  const v = useStore(vehicleStore);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Weather & Environment Card (Replaces Climate Control) */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col">
        <div className="flex flex-col mb-4 gap-1">
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
              Environment
            </h3>
          </div>

          {/* Sub-header: Location Address BELOW title with Icon */}
          <div className="flex items-center gap-1.5 pl-1">
            <svg
              className="w-3 h-3 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span
              className="text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate w-full"
              title={v.location_address}
            >
              {v.location_address || "Outside"}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {/* Outside Weather */}
          <WeatherRow
            label="Outside"
            value={`${v.outside_temp || "--"}°C`}
            subValue="Live"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                ></path>
              </svg>
            }
          />

          {/* Cabin Temp (Avg) */}
          <WeatherRow
            label="Cabin"
            value={
              v.inside_temp !== undefined && v.inside_temp !== null
                ? `${v.inside_temp}°C`
                : "--"
            }
            subValue={`Fan: ${v.fan_speed !== undefined && v.fan_speed !== null ? v.fan_speed : "--"}`}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                ></path>
              </svg>
            }
          />
        </div>

        {/* Status Badges (Read Only) */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-bold text-gray-500">Pet Mode</span>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${Number(v.pet_mode) === 1 ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-gray-200 text-gray-500"}`}
            >
              {Number(v.pet_mode) === 1 ? "ON" : "OFF"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-xs font-bold text-gray-500">Camp Mode</span>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${Number(v.camp_mode) === 1 ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-gray-200 text-gray-500"}`}
            >
              {Number(v.camp_mode) === 1 ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      {/* Map Card (Unchanged) */}
      <div className="flex-1 rounded-3xl bg-white p-2 shadow-sm border border-gray-100 min-h-[250px] flex flex-col">
        <div className="flex justify-between items-center px-4 py-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Location Live
          </h3>
        </div>
        <div className="flex-1 bg-gray-100 rounded-2xl relative overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            title="Vehicle Location"
            src={`https://maps.google.com/maps?q=${v.latitude || 21.0285},${v.longitude || 105.8542}&z=15&output=embed&iwloc=near`}
            className="absolute w-[150%] h-[150%] top-[-25%] left-[-25%] filter grayscale contrast-[1.1] opacity-90 mix-blend-multiply"
            style={{ pointerEvents: "auto" }} // Enable interaction, used CSS scaling to hide controls
          ></iframe>

          {/* Custom Map Marker Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="relative -mt-8">
              {/* Pulse Effect */}
              <div className="absolute inset-0 animate-ping opacity-75 rounded-full bg-blue-400 w-full h-full"></div>
              {/* Car Icon Marker */}
              <div className="relative bg-blue-600 border-2 border-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </div>
              {/* Triangle Tip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600"></div>
            </div>
          </div>

          {/* Overlay Controls */}
          <div className="absolute bottom-4 right-4 bg-white p-2 rounded-full text-blue-600 shadow-lg cursor-pointer hover:bg-blue-50 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
