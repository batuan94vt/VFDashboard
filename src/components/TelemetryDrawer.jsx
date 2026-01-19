import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { vehicleStore, fetchFullTelemetry } from "../stores/vehicleStore";

export default function TelemetryDrawer({ isOpen, onClose }) {
  const vehicle = useStore(vehicleStore);
  const [searchTerm, setSearchTerm] = useState("");

  const data = vehicle.fullTelemetryData[vehicle.vin] || [];
  const aliases = vehicle.fullTelemetryAliases[vehicle.vin] || [];
  const timestamp = vehicle.fullTelemetryTimestamps[vehicle.vin];

  // Map raw data with alias metadata
  const mappedData = React.useMemo(() => {
    return data.map((item) => {
      // Find matching alias by objectId, instanceId, resourceId
      const parts = (item.deviceKey || "").split("_");
      // API Keys are strings (e.g. "34180") but deviceKey has padding (e.g. "34180")
      // To be safe, we parse int to remove leading zeros, then back to string
      const oid = String(parseInt(parts[0], 10));
      const iid = String(parseInt(parts[1], 10));
      const rid = String(parseInt(parts[2], 10));

      const meta = aliases.find(
        (a) =>
          String(a.devObjID) === oid &&
          String(a.devObjInstID || "0") === iid &&
          String(a.devRsrcID || "0") === rid,
      );

      return {
        ...item,
        name: meta?.name || null,
        units: meta?.units || null,
        alias: meta?.alias || null,
      };
    });
  }, [data, aliases]);

  useEffect(() => {
    if (isOpen && !timestamp && !vehicle.isScanning) {
      fetchFullTelemetry(vehicle.vin);
    }
  }, [isOpen, vehicle.vin, timestamp]);

  const handleRefresh = () => {
    fetchFullTelemetry(vehicle.vin, true);
  };

  const handleExport = () => {
    const exportData = {
      vin: vehicle.vin,
      timestamp: new Date().toISOString(),
      data: mappedData,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vfdash_telemetry_${vehicle.vin}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredData = mappedData.filter((item) => {
    const search = searchTerm.toLowerCase();
    const deviceKey = (item.deviceKey || "").toLowerCase();
    const value = String(item.value || "").toLowerCase();
    const name = (item.name || "").toLowerCase();
    const alias = (item.alias || "").toLowerCase();
    return (
      deviceKey.includes(search) ||
      value.includes(search) ||
      name.includes(search) ||
      alias.includes(search)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Vehicle Telemetry
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-tight bg-gray-100 px-1.5 py-0.5 rounded">
                {vehicle.vin}
              </span>
              {timestamp && (
                <span className="text-[10px] text-gray-400">
                  Last Updated: {new Date(timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2 overflow-hidden shrink-0">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by key or value..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg text-sm transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={handleRefresh}
            disabled={vehicle.isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-95"
          >
            <svg
              className={`w-4 h-4 ${vehicle.isScanning ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Full Scan
          </button>
          <button
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:bg-gray-100 text-indigo-600 disabled:text-gray-400 text-sm font-bold rounded-lg border border-indigo-100 transition-all active:scale-95"
            title="Export to JSON"
          >
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-gray-50/30">
          {vehicle.isScanning ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-gray-900 font-bold">
                  Scanning Vehicle Resources...
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Fetching aliases and deep scanning telemetry
                </p>
              </div>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredData.map((item, idx) => (
                <div
                  key={idx}
                  className="px-6 py-4 hover:bg-white transition-colors group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                          {item.name || item.alias || "Unknown Parameter"}
                        </p>
                        {item.units && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {item.units}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] font-mono font-medium text-gray-400 uppercase leading-none group-hover:text-blue-500 transition-colors">
                        {item.alias || item.deviceKey}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800 break-all leading-tight bg-gray-100/50 p-2 rounded border border-gray-100">
                        {String(item.value)}
                      </p>
                    </div>
                    {/* Optional: Add labels or descriptions if we map them later */}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg
                className="w-12 h-12 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="font-medium">
                {searchTerm ? "No results found" : "No telemetry data yet"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-400 flex justify-between items-center shrink-0">
          <span>{filteredData.length} entries matching</span>
          <span>VinFast Dashboard Community</span>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.1);
        }
      `,
        }}
      />
    </div>
  );
}
