import React from "react";
import { useStore } from "@nanostores/react";
import { vehicleStore } from "../stores/vehicleStore";
import { TIRE_PRESSURE, TEMPERATURE, GEARS } from "../constants/vehicle";

// Tire Pressure Card - Polished Visuals with Full Labels
const TireCard = ({ pressure, temp, label, positionClass }) => {
  const hasData = pressure !== null && pressure !== undefined;

  // Normalize Pressure to Bar
  let displayPressure = "--";
  if (hasData) {
    let val = pressure;
    if (val > 100) {
      // Assume kPa (e.g. 230) -> Bar
      val = val / 100;
    } else if (val > 8) {
      // Assume PSI (e.g. 35) -> Bar
      val = val / 14.5038;
    }
    // If < 8, assume default Bar
    displayPressure = Number(val).toFixed(1);
  }

  // Status Logic for Coloring (using Bar values)
  // Warning conditions: Pressure < LIMIT_LOW or > LIMIT_HIGH, OR Temp > LIMIT_HIGH
  const limitPressureLow = TIRE_PRESSURE.LIMIT_LOW;
  const limitPressureHigh = TIRE_PRESSURE.LIMIT_HIGH;
  const limitTempHigh = TEMPERATURE.LIMIT_HIGH;

  // We check raw converted value for warning logic
  const numericPressure = hasData ? Number(displayPressure) : null;
  const isWarning =
    hasData &&
    (numericPressure < limitPressureLow ||
      numericPressure > limitPressureHigh ||
      (temp && temp > limitTempHigh));

  // Dynamic Styles based on status
  // Normal: Green Safe Theme
  // Warning: Amber/Orange Theme
  const cardBg = isWarning
    ? "bg-amber-50/90 border-amber-200"
    : "bg-emerald-50/90 border-emerald-200";
  const textColor = isWarning ? "text-amber-600" : "text-emerald-700";
  const labelColor = isWarning ? "text-amber-600/70" : "text-emerald-600/70";
  const valueColor = isWarning ? "text-amber-600" : "text-emerald-600";
  const subTextColor = isWarning ? "text-amber-500" : "text-emerald-500";

  return (
    <div
      className={`absolute ${positionClass} ${cardBg} backdrop-blur-sm px-2 md:px-3 py-1.5 md:py-2.5 rounded-xl border shadow-sm flex flex-col gap-0 md:gap-0.5 w-[110px] md:w-[130px] transition-all hover:scale-105 hover:bg-white hover:border-gray-200 hover:shadow-md z-20`}
    >
      {/* Label - colored by status */}
      <span
        className={`text-[10px] uppercase ${labelColor} font-extrabold tracking-wider leading-none mb-1`}
      >
        {label}
      </span>

      {/* Stats Container */}
      <div className="flex flex-col">
        {/* Pressure Row */}
        <div className="flex items-baseline gap-1">
          <span
            className={`text-xl md:text-2xl font-black tracking-tighter ${valueColor}`}
          >
            {displayPressure}
          </span>
          <span className={`text-[10px] ${subTextColor} font-bold uppercase`}>
            {TIRE_PRESSURE.UNIT}
          </span>
        </div>

        {/* Temp Row */}
        {temp !== null && temp !== undefined && (
          <div className="flex items-center gap-1 -mt-0.5">
            <span className={`text-xs font-bold ${textColor}`}>{temp}</span>
            <span className={`text-[10px] ${subTextColor} font-medium`}>
              {TEMPERATURE.UNIT}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Warning Item Component
const WarningItem = ({ label }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 animate-pulse">
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      ></path>
    </svg>
    <span className="text-xs font-bold">{label}</span>
  </div>
);

export default function DigitalTwin() {
  const data = useStore(vehicleStore);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, []);

  // Collect active warnings
  const warnings = [];
  if (data.door_fl || data.door_fr || data.door_rl || data.door_rr)
    warnings.push("Door Open");
  if (data.trunk_status) warnings.push("Trunk Open");
  if (data.hood_status) warnings.push("Hood Open");
  if (data.central_lock_status === false) warnings.push("Unlocked"); // Warning if unlocked

  return (
    <div className="relative w-full h-full min-h-[400px] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Main Visual Area */}
      <div className="relative flex-1 w-full flex items-center justify-center p-4">
        {/* Model Label (Floating) */}
        <div className="absolute top-4 md:top-6 left-4 md:left-8 z-10 flex flex-col">
          <h2 className="text-xl font-black text-gray-900 tracking-wide uppercase leading-none mb-2">
            {data.vin ? (
              data.customizedVehicleName || "VF 9 PLUS"
            ) : (
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
            )}
          </h2>

          {/* Odometer & Driving Time */}
          <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
            <div className="flex items-baseline gap-1">
              {data.vin ? (
                <>
                  <span className="text-lg font-bold text-gray-700 leading-none">
                    {data.odometer !== undefined && data.odometer !== null
                      ? Number(data.odometer).toLocaleString()
                      : "--"}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    km
                  </span>
                </>
              ) : (
                <div className="h-5 w-20 bg-gray-200 animate-pulse rounded"></div>
              )}
            </div>
          </div>

          {/* Warranty Info (New) - Hidden on Mobile Top, moved to bottom */}
          <div className="hidden md:flex mt-2 pt-2 border-t border-gray-100 flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-4 duration-700 delay-500">
            <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Warranty Expires
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 font-mono">
              <span>
                {data.warrantyExpirationDate
                  ? new Date(data.warrantyExpirationDate).toLocaleDateString(
                      "vi-VN",
                    )
                  : "--"}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                {data.warrantyMileage
                  ? `${Number(data.warrantyMileage).toLocaleString()} km`
                  : "--"}
              </span>
            </div>
          </div>
        </div>

        {/* Car Image */}
        {/* Car Image with Skeleton */}
        <div className="relative w-full max-w-[520px] aspect-[16/10] flex items-center justify-center mt-14 md:mt-4">
          {/* Skeleton */}
          <div
            className={`absolute inset-0 bg-gray-100 rounded-2xl animate-pulse ${imageLoaded ? "hidden" : "block"}`}
          ></div>
          <img
            ref={imgRef}
            src="/vf9-iso-green.png"
            alt="VF9 Isometric"
            className={`w-full h-full object-contain drop-shadow-2xl z-10 scale-105 transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/vf9-interior.png";
              setImageLoaded(true);
            }}
          />
        </div>

        {/* Tire Cards */}
        {/* Remapped Data: TL=FR, TR=RR, BL=FL, BR=RL */}
        {/* Mobile: Push outwards (2%) to avoid covering image. Desktop: Keep 8% */}

        <TireCard
          pressure={data.tire_pressure_fr}
          temp={data.tire_temp_fr}
          label="FRONT RIGHT"
          positionClass="top-[22%] left-[1%] md:left-[8%]"
        />
        <TireCard
          pressure={data.tire_pressure_rr}
          temp={data.tire_temp_rr}
          label="REAR RIGHT"
          positionClass="top-[22%] right-[1%] md:right-[8%]"
        />

        <TireCard
          pressure={data.tire_pressure_fl}
          temp={data.tire_temp_fl}
          label="FRONT LEFT"
          positionClass="bottom-[2%] left-[1%] md:left-[8%]"
        />
        <TireCard
          pressure={data.tire_pressure_rl}
          temp={data.tire_temp_rl}
          label="REAR LEFT"
          positionClass="bottom-[2%] right-[1%] md:right-[8%]"
        />
      </div>

      {/* Bottom Controls Area */}
      <div className="h-auto w-full bg-white flex flex-col items-center justify-end pb-6 space-y-4 z-30">
        {/* Mobile Warranty Info - Visible only on Mobile */}
        <div className="md:hidden flex flex-col items-center gap-0.5 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Warranty
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
              {data.warrantyExpirationDate
                ? new Date(data.warrantyExpirationDate).toLocaleDateString(
                    "en-US",
                    { month: "short", year: "numeric" },
                  )
                : "--"}
            </span>
            <span className="text-gray-300">•</span>
            <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
              {data.warrantyMileage
                ? `${Number(data.warrantyMileage).toLocaleString()} km`
                : "--"}
            </span>
          </div>
        </div>

        {/* Gear Selector */}
        <div className="bg-gray-50/80 backdrop-blur-md px-10 py-3.5 rounded-full flex items-center gap-8 border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] relative z-30">
          {[GEARS.PARK, GEARS.REVERSE, GEARS.NEUTRAL, GEARS.DRIVE].map(
            (gear) => {
              // Normalize data gear (handle numbers or strings)
              const current = data.gear_position;
              // Generic Mapping attempt:
              // P: 'P', 1, 128
              // R: 'R', 2
              // N: 'N', 3
              // D: 'D', 4, 9 (Drive)
              let isActive = false;
              if (String(current) === gear) isActive = true;
              if (
                gear === "P" &&
                (current === 1 || current === 128 || current === 0)
              )
                isActive = true;
              if (gear === "R" && current === 2) isActive = true;
              if (gear === "N" && current === 3) isActive = true;
              if (gear === "D" && (current === 4 || current === 9))
                isActive = true;

              return (
                <span
                  key={gear}
                  className={`text-base font-black transition-all duration-300 ${isActive ? "text-blue-600 scale-125" : "text-gray-300 hover:text-gray-400"}`}
                >
                  {gear}
                </span>
              );
            },
          )}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <span
            className={`text-base font-black transition-all duration-300 ${data.gear_position === GEARS.SPORT || data.gear_position === 5 ? "text-red-500 scale-125" : "text-gray-300 hover:text-gray-400"}`}
          >
            {GEARS.SPORT}
          </span>
        </div>

        {/* Warnings Section */}
        <div className="h-8 flex items-center justify-center w-full">
          {warnings.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {warnings.map((w, idx) => (
                <WarningItem key={idx} label={w} />
              ))}
            </div>
          ) : (
            /* Show nothing or minimal status when safe */
            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1.5">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Ready
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
