import { map } from "nanostores";
import { api } from "../services/api";
import { DEFAULT_LOCATION } from "../constants/vehicle";
import { resetRefreshTimer, setRefreshing } from "./refreshTimerStore";
import { getMqttClient } from "../services/mqttClient";

export interface VehicleInfo {
  vinCode: string;
  marketingName?: string;
  vehicleVariant?: string; // e.g., "PLUS"
  color?: string; // Hex or Name
  exteriorColor?: string;
  interiorColor?: string;
  yearOfProduct?: number;
  vehicleName?: string;
  customizedVehicleName?: string;
  userVehicleType?: string; // "OWNER" etc.
  vehicleImage?: string;
  profileImage?: string;
  warrantyExpirationDate?: string | null;
  warrantyMileage?: number | null;
  batteryCapacity?: number | null; // kWh
  vehicleAliasVersion?: string;
}

export interface VehicleState {
  // Store Metadata
  vehicles: VehicleInfo[]; // List of all available vehicles
  vehicleCache: Record<string, Partial<VehicleState>>; // Cache for switched vehicles

  battery_level: number | null;
  range: number | null;
  odometer: number | null;
  charging_status: number | boolean;
  speed: number | null;
  // Location
  latitude: number;
  longitude: number;

  // Display Info
  vin: string | null;
  model: string;
  trim: string;
  user_name: string;
  user_avatar: string;
  vinfast_profile_image?: string; // Authoritative image from User-Vehicle API

  // Extended Header Info
  marketingName?: string;
  vehicleVariant?: string;
  color?: string;
  yearOfProduct?: number;
  customizedVehicleName?: string;
  userVehicleType?: string;
  vehicleImage?: string; // Link image from API
  manufacturer?: string;
  interiorColor?: string;

  // Climate
  outside_temp?: number | null;
  weather_outside_temp?: number | null;
  inside_temp?: number | null; // From Telemetry
  fan_speed?: number | null;
  weather_code?: number | null;
  location_address?: string;
  weather_address?: string;

  // ECU
  bms_version?: string;
  gateway_version?: string;
  ecu_head_unit?: string;
  ecu_tailgate?: string;
  ecu_door_control?: string;
  ecu_seat_control?: string;

  ignition_status?: number | string | null;
  heading?: number;

  // Detailed Versions
  mhu_version?: string;
  vcu_version?: string;
  bcm_version?: string;

  // Vehicle Status
  firmware_version?: string;
  tbox_version?: string;
  thermal_warning?: string | number; // 1 = Warning, 0 = Normal
  service_alert?: string | number;
  next_service_mileage?: number | null;
  next_service_date?: string | null;
  service_appointment_id?: string | null;
  service_appointment_status?: string | null;

  // Driving Stats
  central_lock_status?: boolean; // True=Locked?
  handbrake_status?: boolean; // True=Engaged
  window_status?: string | number; // Window state

  // Warranty
  warrantyExpirationDate?: string | null;
  warrantyMileage?: number | null;

  // Doors
  door_fl?: boolean;
  door_fr?: boolean;
  door_rl?: boolean;
  door_rr?: boolean;
  trunk_status?: boolean;
  hood_status?: boolean;
  // Tires (Bar/kPa and Temp)
  tire_pressure_fl?: number | null;
  tire_pressure_fr?: number | null;
  tire_pressure_rl?: number | null;
  tire_pressure_rr?: number | null;
  tire_temp_fl?: number | null;
  tire_temp_fr?: number | null;
  tire_temp_rl?: number | null;
  tire_temp_rr?: number | null;

  // Control / Status
  gear_position?: string | null; // P, R, N, D, S
  is_locked?: boolean | null;

  // Climate Details
  climate_driver_temp?: number | null;
  climate_passenger_temp?: number | null;

  // Module C - Battery Details
  target_soc?: number | null;
  remaining_charging_time?: number | null;
  battery_health_12v?: string | null; // OK/Low
  soh_percentage?: number | null;
  battery_capacity_kwh?: number | null; // From user-vehicle API
  battery_nominal_capacity_kwh?: number | null; // From telemetry alias
  battery_type?: string;
  battery_serial?: string | null;
  battery_manufacture_date?: string | null;
  // Full Telemetry Cache
  fullTelemetryData: Record<string, any[]>; // VIN -> Raw Array
  fullTelemetryAliases: Record<string, any[]>; // VIN -> Alias Array
  fullTelemetryTimestamps: Record<string, number>; // VIN -> Timestamp
  isScanning: boolean;
  debugLog?: any[]; // For storing deep scan candidates
  debugLogByVin?: Record<string, any[]>;

  lastUpdated: number;
  isRefreshing?: boolean;
  isInitialized?: boolean;
  isEnriching?: boolean; // True when fetching Location/Weather externally
}

// Demo Mode / Default State
export const vehicleStore = map<VehicleState>({
  vehicles: [],
  vehicleCache: {},

  vin: null,
  model: "",
  trim: "",
  user_name: "",
  user_avatar: "",

  battery_level: null,
  range: null,
  odometer: null,
  charging_status: false,
  speed: null,
  latitude: DEFAULT_LOCATION.LATITUDE,
  longitude: DEFAULT_LOCATION.LONGITUDE,

  // Control
  gear_position: null,
  is_locked: null,

  // Climate
  climate_driver_temp: null,
  climate_passenger_temp: null,
  fan_speed: null,
  outside_temp: null,
  inside_temp: null,

  // Tires
  tire_pressure_fl: null,
  tire_temp_fl: null,
  tire_pressure_fr: null,
  tire_temp_fr: null,
  tire_pressure_rl: null,
  tire_temp_rl: null,
  tire_pressure_rr: null,
  tire_temp_rr: null,

  // Doors (Closed)
  door_fl: false,
  door_fr: false,
  door_rl: false,
  door_rr: false,
  trunk_status: false,
  hood_status: false,

  // New Status
  handbrake_status: false,
  window_status: undefined,

  // Battery Details (Module C)
  target_soc: null,
  remaining_charging_time: null,
  soh_percentage: null,
  battery_health_12v: null,
  battery_capacity_kwh: null,
  battery_nominal_capacity_kwh: null,
  battery_type: "--",
  battery_serial: null,
  battery_manufacture_date: null,

  // ECU
  bms_version: "--",
  gateway_version: "--",
  ecu_head_unit: "--",

  ignition_status: null,
  heading: 0,

  mhu_version: "--",
  vcu_version: "--",
  bcm_version: "--",

  central_lock_status: undefined,

  // Warranty
  warrantyExpirationDate: null,
  warrantyMileage: null,

  // Vehicle Status
  firmware_version: "--",
  tbox_version: "--",
  thermal_warning: 0,
  service_alert: 0,
  next_service_mileage: null,
  next_service_date: null,
  service_appointment_id: null,
  service_appointment_status: null,

  // Full Telemetry Cache
  fullTelemetryData: {},
  fullTelemetryAliases: {},
  fullTelemetryTimestamps: {},
  isScanning: false,
  debugLog: [],
  debugLogByVin: {},

  lastUpdated: Date.now(),
  isRefreshing: false,
  isInitialized: false,
  isEnriching: false,
});

const telemetryFetchInFlight = new Map<string, Promise<void>>();
let telemetryInFlightCount = 0;
const locationEnrichInFlight = new Map<string, Promise<void>>();
const locationEnrichState = new Map<
  string,
  { lat: number; lon: number; lastAttemptAt: number }
>();

type MqttTelemetryCatalogEntry = {
  keys: string[];
  lastUpdated: number;
};

const mqttRawTelemetryByVin = new Map<string, Map<string, any>>();
const mqttTelemetryCatalog = new Map<string, MqttTelemetryCatalogEntry>();
const MQTT_TELEMETRY_CATALOG_STORAGE_KEY = "vf-mqtt-telemetry-catalog:v1";
const MQTT_TELEMETRY_CATALOG_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MQTT_DEEP_SCAN_REGISTER_BATCH_SIZE = 24;
const MQTT_DEEP_SCAN_RETRY_ROUNDS = 3;
const MQTT_DEEP_SCAN_RETRY_DELAY_MS = 700;
const MIN_DEEP_SCAN_CACHE_ITEMS = 200;
const MQTT_DEEP_SCAN_CACHE_FULL_RETRY_RATIO = 0.6;
const sleepMs = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const loadMqttTelemetryCatalog = (): void => {
  if (typeof window === "undefined") return;
  if (mqttTelemetryCatalog.size > 0) return;

  try {
    const raw = window.localStorage.getItem(MQTT_TELEMETRY_CATALOG_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as Record<string, MqttTelemetryCatalogEntry>;
    const now = Date.now();

    Object.entries(parsed || {}).forEach(([vin, entry]) => {
      const keys = Array.isArray(entry?.keys) ? entry.keys : [];
      const lastUpdated =
        typeof entry?.lastUpdated === "number" ? entry.lastUpdated : now;
      const isFresh = now - lastUpdated <= MQTT_TELEMETRY_CATALOG_TTL_MS;
      if (!vin || !keys.length || !isFresh) return;
      mqttTelemetryCatalog.set(vin, {
        keys: [...new Set(keys.map((k) => String(k)))],
        lastUpdated,
      });
    });
  } catch (error) {
    console.warn("Failed to load MQTT telemetry catalog", error);
  }
};

const persistMqttTelemetryCatalog = () => {
  if (typeof window === "undefined") return;

  try {
    const payload = JSON.stringify(
      Object.fromEntries(
        [...mqttTelemetryCatalog.entries()].map(([vin, entry]) => [
          vin,
          {
            keys: entry.keys,
            lastUpdated: entry.lastUpdated,
          },
        ]),
      ),
    );
    window.localStorage.setItem(MQTT_TELEMETRY_CATALOG_STORAGE_KEY, payload);
  } catch (error) {
    console.warn("Failed to persist MQTT telemetry catalog", error);
  }
};

const setCachedTelemetryKeys = (vin: string, keys: Iterable<string>) => {
  if (!vin) return;

  loadMqttTelemetryCatalog();
  mqttTelemetryCatalog.set(vin, {
    keys: [...new Set(keys)].sort(),
    lastUpdated: Date.now(),
  });
  persistMqttTelemetryCatalog();
};

const getCachedTelemetryKeys = (vin: string): string[] => {
  if (!vin) return [];

  loadMqttTelemetryCatalog();
  const entry = mqttTelemetryCatalog.get(vin);
  if (!entry || !entry.keys.length) return [];
  const now = Date.now();
  if (now - entry.lastUpdated > MQTT_TELEMETRY_CATALOG_TTL_MS) return [];
  return entry.keys;
};

const clearCachedTelemetryCatalog = (vin?: string) => {
  if (vin) {
    mqttTelemetryCatalog.delete(vin);
    persistMqttTelemetryCatalog();
    return;
  }

  mqttTelemetryCatalog.clear();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MQTT_TELEMETRY_CATALOG_STORAGE_KEY);
  }
};

const normalizeFieldNumber = (value: any, fallback = "0") => {
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = Number.parseInt(String(value), 10);
  return Number.isFinite(normalized) ? String(normalized) : fallback;
};

const normalizeTelemetryKey = (item: any) => {
  if (!item || typeof item !== "object") return "";

  const deviceKey = String(item.deviceKey || "").trim().replace(/\//g, "_");
  if (deviceKey) {
    const rawParts = deviceKey.split("_").filter(Boolean);
    if (rawParts.length === 3) {
      const objectId = normalizeFieldNumber(rawParts[0], "");
      const instanceId = normalizeFieldNumber(rawParts[1], "0");
      const resourceId = normalizeFieldNumber(rawParts[2], "");
      if (objectId && resourceId) {
        return `${objectId}|${instanceId}|${resourceId}`;
      }
    }
  }

  const objectId = item.objectId ?? item.object_id ?? item.oid;
  const instanceId = item.instanceId ?? item.instance_id ?? item.iid ?? "0";
  const resourceId = item.resourceId ?? item.resource_id ?? item.rid;
  if (objectId && resourceId) {
    return `${normalizeFieldNumber(objectId, "")}|${normalizeFieldNumber(
      instanceId,
      "0",
    )}|${normalizeFieldNumber(resourceId, "")}`;
  }

  return "";
};

const ingestMqttTelemetry = (vin: string, messages: any[]) => {
  if (!vin || !Array.isArray(messages) || messages.length === 0) return;
  loadMqttTelemetryCatalog();

  let bucket = mqttRawTelemetryByVin.get(vin);
  if (!bucket) {
    bucket = new Map<string, any>();
    mqttRawTelemetryByVin.set(vin, bucket);
  }

  const discoveredKeys = new Set<string>();

  const now = Date.now();
  for (const item of messages) {
    const key = normalizeTelemetryKey(item);
    if (!key) continue;

    const [objectId, instanceId, resourceId] = key.split("|");
    const deviceKey = `${objectId}_${instanceId}_${resourceId}`;
    if (!item || typeof item !== "object") continue;

    bucket.set(key, {
      ...item,
      objectId,
      instanceId,
      resourceId,
      deviceKey,
      lastUpdated: item.timestamp || now,
    });

    discoveredKeys.add(key);
  }

  if (discoveredKeys.size > 0) {
    const existing = mqttRawTelemetryByVin.get(vin);
    const finalKeys = new Set<string>(discoveredKeys);
    if (existing) {
      existing.forEach((_item, key) => finalKeys.add(key));
    }
    setCachedTelemetryKeys(vin, finalKeys);
  }

};

const getRawMqttTelemetry = (vin: string) => {
  const bucket = mqttRawTelemetryByVin.get(vin);
  if (!bucket) return [];
  return [...bucket.values()];
};

  const getCachedRequestObjects = (vin: string, aliases: any[]) => {
  const cachedKeys = getCachedTelemetryKeys(vin);
  if (!cachedKeys.length) return [];

  const cachedSet = new Set(cachedKeys);

  const toAliasKey = (item: any) => {
    const objectId = normalizeFieldNumber(
      item?.devObjID ?? item?.devObjId ?? item?.objectId ?? item?.object_id ??
        item?.objID ?? item?.objId ?? item?.object,
      "",
    );
    const instanceId = normalizeFieldNumber(
      item?.devObjInstID ?? item?.devObjInstId ?? item?.instanceId ??
        item?.instance_id ?? item?.iid ?? item?.instance,
      "0",
    );
    const resourceId = normalizeFieldNumber(
      item?.devRsrcID ?? item?.devRsrcId ?? item?.resourceId ??
        item?.resource_id ?? item?.rsrcID ?? item?.rsrcId ?? item?.resource,
      "",
    );

    if (!objectId || !resourceId) return "";
    return `${objectId}|${instanceId}|${resourceId}`;
  };

  return aliases.filter((alias) => cachedSet.has(toAliasKey(alias)));
};

const buildRequestObjects = (items: any[]) => {
  const getAliasField = (item: any, keys: string[]) => {
    const normalizedKeys = Object.keys(item || {}).reduce((acc: any, key) => {
      acc[key.toLowerCase()] = item[key];
      return acc;
    }, {});

    for (const key of keys) {
      if (item && item[key] != null && item[key] !== "") return item[key];
      const lower = key.toLowerCase();
      if (normalizedKeys[lower] != null && normalizedKeys[lower] !== "") {
        return normalizedKeys[lower];
      }
    }
    return "";
  };

  const out = new Map<string, { objectId: string; instanceId: string; resourceId: string }>();
  for (const item of items) {
    const objectId = getAliasField(item, [
      "objectId",
      "object_id",
      "devObjID",
      "devObjId",
      "objID",
      "objId",
      "object",
    ]);
    const instanceId = getAliasField(item, [
      "instanceId",
      "instance_id",
      "instance",
      "devObjInstID",
      "devObjInstId",
      "iid",
    ]);
    const resourceId = getAliasField(item, [
      "resourceId",
      "resource_id",
      "devRsrcID",
      "devRsrcId",
      "rsrcID",
      "rsrcId",
      "devRsrc",
    ]);

    if (!objectId || !resourceId) {
      continue;
    }

    const key = `${objectId}|${instanceId ?? "0"}|${resourceId}`;
    if (!out.has(key)) {
      out.set(key, {
        objectId: String(objectId),
        instanceId: String(instanceId ?? "0"),
        resourceId: String(resourceId),
      });
    }
  }

  return [...out.values()];
};

const chunkList = <T>(items: T[], size: number): T[][] => {
  if (!size || size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const LOCATION_ENRICH_TTL_MS = 3 * 60 * 1000;
const LOCATION_ENRICH_DISTANCE_M = 500;
const LOCATION_ENRICH_TIMEOUT_MS = 5000;

const toCoordNumber = (value: any): number | null => {
  const valueNum = typeof value === "number" ? value : Number(value);
  return Number.isFinite(valueNum) ? valueNum : null;
};

const isValidCoordPair = (
  latitude: number | null,
  longitude: number | null,
): latitude is number => {
  if (latitude == null || longitude == null) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
};

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(a)));
};

const shouldEnrichLocationWeather = (
  vin: string,
  latitude: number,
  longitude: number,
  force = false,
) => {
  if (force) return true;

  const now = Date.now();
  const latest = locationEnrichState.get(vin);
  if (!latest) return true;
  if (now - latest.lastAttemptAt > LOCATION_ENRICH_TTL_MS) return true;

  const movedMeters = haversineMeters(
    latest.lat,
    latest.lon,
    latitude,
    longitude,
  );
  return movedMeters >= LOCATION_ENRICH_DISTANCE_M;
};

const enrichLocationAndWeather = async (
  vin: string,
  latitude: number,
  longitude: number,
  force = false,
) => {
  if (!isValidCoordPair(latitude, longitude)) return;
  if (!shouldEnrichLocationWeather(vin, latitude, longitude, force)) return;

  const existing = locationEnrichInFlight.get(vin);
  if (existing) return existing;

  const task = (async () => {
    const now = Date.now();
    const activeState = vehicleStore.get();
    const isActiveVin = activeState.vin === vin;
    if (isActiveVin) {
      vehicleStore.setKey("isEnriching", true);
    }

    const timeout = (ms: number) =>
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("External enrichment timeout")), ms),
      );

    try {
      const [geoResult, weatherResult] = await Promise.allSettled([
        Promise.race([
          api.fetchLocationName(latitude, longitude),
          timeout(LOCATION_ENRICH_TIMEOUT_MS),
        ]),
        Promise.race([
          api.fetchWeather(latitude, longitude),
          timeout(LOCATION_ENRICH_TIMEOUT_MS),
        ]),
      ]);

      const updatePayload: Partial<VehicleState> = { vin };
      if (geoResult.status === "fulfilled" && geoResult.value) {
        const geo = geoResult.value;
        if (geo.location_address) updatePayload.location_address = geo.location_address;
        if (geo.weather_address) updatePayload.weather_address = geo.weather_address;
      }

      if (weatherResult.status === "fulfilled" && weatherResult.value) {
        const weather = weatherResult.value;
        if (weather.temperature !== undefined) {
          updatePayload.weather_outside_temp = Number(weather.temperature);
        }
        if (weather.weathercode !== undefined) {
          updatePayload.weather_code = Number(weather.weathercode);
        }
      }

      if (Object.keys(updatePayload).length > 1) {
        updateVehicleData(updatePayload);
      }

      locationEnrichState.set(vin, {
        lat: latitude,
        lon: longitude,
        lastAttemptAt: now,
      });
    } catch (e) {
      locationEnrichState.set(vin, {
        lat: latitude,
        lon: longitude,
        lastAttemptAt: now,
      });
    } finally {
      locationEnrichInFlight.delete(vin);
      if (vehicleStore.get().vin === vin) {
        vehicleStore.setKey("isEnriching", false);
      }
    }
  })();

  locationEnrichInFlight.set(vin, task);
  return task;
};

type VehicleDataUpdateOptions = {
  skipNullValues?: boolean;
};

export const updateVehicleData = (
  data: Partial<VehicleState>,
  options: VehicleDataUpdateOptions = {},
) => {
  const sanitize = (
    incoming: Partial<VehicleState>,
    skipNullValues = false,
  ): Partial<VehicleState> => {
    const result: Partial<VehicleState> = {};
    Object.entries(incoming).forEach(([rawKey, value]) => {
      const key = rawKey as keyof VehicleState;

      // Ignore undefined values so partial payloads (common with REST app/ping)
      // do not wipe fields maintained by live MQTT.
      if (value === undefined) return;
      // During REST-refresh flows, treat null as "no signal" for optional signals,
      // while still allowing explicit MQTT null values when passed directly.
      if (skipNullValues && value === null) return;

      result[key] = value;
    });
    return result;
  };

  const current = vehicleStore.get();
  const { skipNullValues = false } = options;

  // We expect 'vin' to be provided in 'data' for robust handling.
  // If not provided, we fallback to current.vin, but this is risky for background updates.
  const incoming = sanitize(data, skipNullValues);
  const targetVin = incoming.vin || current.vin;

  if (!targetVin) return;

  // Ensure lastUpdated is present for cache consistency
  const timestamp =
    incoming.lastUpdated && Number.isFinite(incoming.lastUpdated as number)
      ? incoming.lastUpdated
      : Date.now();
  const dataToCache = { ...incoming, lastUpdated: timestamp };

  // 1. Update Cache
  const latest = vehicleStore.get();
  const currentCache = latest.vehicleCache[targetVin] || {};
  const newCacheEntry = { ...currentCache, ...dataToCache };
  const newVehicleCache = {
    ...latest.vehicleCache,
    [targetVin]: newCacheEntry,
  };

  // 2. Update Store
  if (targetVin === latest.vin) {
    // If active vehicle, update both telemetry and cache in one go
    vehicleStore.set({
      ...latest,
      ...dataToCache,
      vehicleCache: newVehicleCache,
    });
  } else {
    // If background vehicle, only update the cache
    vehicleStore.setKey("vehicleCache", newVehicleCache);
  }
};

// Initial State (Clean Slate for Resetting)
const INITIAL_TELEMETRY: Partial<VehicleState> = {
  battery_level: null,
  range: null,
  odometer: null,
  charging_status: false,
  speed: null,
  latitude: DEFAULT_LOCATION.LATITUDE,
  longitude: DEFAULT_LOCATION.LONGITUDE,

  // Control
  gear_position: null,
  is_locked: null,

  // Climate
  climate_driver_temp: null,
  climate_passenger_temp: null,
  fan_speed: null,
  outside_temp: null,
  inside_temp: null,

  // Tires
  tire_pressure_fl: null,
  tire_temp_fl: null,
  tire_pressure_fr: null,
  tire_temp_fr: null,
  tire_pressure_rl: null,
  tire_temp_rl: null,
  tire_pressure_rr: null,
  tire_temp_rr: null,

  // Doors
  door_fl: false,
  door_fr: false,
  door_rl: false,
  door_rr: false,
  trunk_status: false,
  hood_status: false,

  // New Status
  handbrake_status: false,
  window_status: undefined,

  // Battery
  target_soc: null,
  remaining_charging_time: null,
  soh_percentage: null,
  battery_health_12v: null,
  battery_nominal_capacity_kwh: null,
  battery_type: "--",
  battery_serial: null,
  battery_manufacture_date: null,

  // Full Telemetry
  fullTelemetryData: {},
  fullTelemetryTimestamps: {},
  isScanning: false,

  // ECU & Versions
  bms_version: "--",
  gateway_version: "--",
  ecu_head_unit: "--",
  ignition_status: null,
  heading: 0,
  mhu_version: "--",
  vcu_version: "--",
  bcm_version: "--",

  central_lock_status: undefined,

  // Vehicle Status
  firmware_version: "--",
  tbox_version: "--",
  thermal_warning: 0,
  service_alert: 0,
  next_service_mileage: null,
  next_service_date: null,
  service_appointment_id: null,
  service_appointment_status: null,
};

const parseBatteryCapacityKwh = (vehicleInfo: any): number | null => {
  const rawBatteryCapacity =
    vehicleInfo?.batteryCapacity ??
    vehicleInfo?.battery_capacity ??
    vehicleInfo?.batteryCapacityKwh ??
    vehicleInfo?.batteryCapacityKWH;
  const batteryCapacity =
    rawBatteryCapacity !== null &&
    rawBatteryCapacity !== undefined &&
    rawBatteryCapacity !== ""
      ? Number(rawBatteryCapacity)
      : null;

  return Number.isFinite(batteryCapacity) ? batteryCapacity : null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const TELEMETRY_SIGNALS: Array<keyof VehicleState> = [
  "battery_level",
  "range",
  "speed",
  "odometer",
  "remaining_charging_time",
  "battery_health_12v",
  "soh_percentage",
  "tire_pressure_fl",
  "tire_pressure_fr",
  "tire_pressure_rl",
  "tire_pressure_rr",
  "battery_capacity_kwh",
  "latitude",
  "longitude",
  "outside_temp",
  "inside_temp",
];

const hasTelemetryValues = (data: Partial<VehicleState> | undefined | null) => {
  if (!data) return false;

  const lastUpdated = data.lastUpdated;
  if (typeof lastUpdated !== "number" || !Number.isFinite(lastUpdated)) return false;
  const now = Date.now();
  if (lastUpdated > now + 5 * 60 * 1000) return false;
  if (now - lastUpdated > CACHE_TTL_MS) return false;

  return TELEMETRY_SIGNALS.some((key) => {
    const value = data[key];
    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "number" && Number.isNaN(value)) return false;
    if (typeof value === "number" && Number.isFinite(value)) return true;
    if (typeof value === "string" && value !== "--" && value.trim() !== "") return true;
    if (typeof value === "boolean") return true;
    return false;
  });
};

const getVehicleBaseState = (
  vehicleInfo: any,
  current: VehicleState,
): Partial<VehicleState> => {
  const batteryCapacity = parseBatteryCapacityKwh(vehicleInfo);

  return {
    vin: vehicleInfo.vinCode,
    marketingName: vehicleInfo.marketingName,
    vehicleVariant: vehicleInfo.vehicleVariant,
    color: vehicleInfo.exteriorColor || vehicleInfo.color,
    yearOfProduct: vehicleInfo.yearOfProduct,
    interiorColor: vehicleInfo.interiorColor,
    customizedVehicleName:
      vehicleInfo.customizedVehicleName || vehicleInfo.vehicleName,
    userVehicleType: vehicleInfo.userVehicleType,
    vehicleImage: vehicleInfo.vehicleImage, // from API
    vinfast_profile_image: vehicleInfo.profileImage, // Authoritative
    // Only update avatar if present
    user_avatar: vehicleInfo.profileImage || current.user_avatar,
    // Warranty
    warrantyExpirationDate: vehicleInfo.warrantyExpirationDate,
    warrantyMileage: vehicleInfo.warrantyMileage,
    battery_capacity_kwh: batteryCapacity,
  };
};

const refreshLocationWeatherForVin = (
  vin: string,
  telemetry: Partial<VehicleState> | null,
) => {
  if (!vin) return;
  if (!telemetry) return;

  const latitude = toCoordNumber(telemetry.latitude);
  const longitude = toCoordNumber(telemetry.longitude);
  if (!isValidCoordPair(latitude, longitude)) return;

  // Keep smart cache: helper decides TTL/distance/in-flight dedupe.
  void enrichLocationAndWeather(vin, latitude, longitude, false);
};

export const switchVehicle = async (targetVin: string) => {
  const current = vehicleStore.get();

  // 1. Find the vehicle in the list
  const vehicleInfo = current.vehicles.find((v) => v.vinCode === targetVin);
  if (!vehicleInfo) {
    console.error("Vehicle not found during switch", targetVin);
    return;
  }

  // 2. Prepare Base State from Vehicle Info
  const baseState = getVehicleBaseState(vehicleInfo, current);

  // 3. Hydrate from Cache if available
  const cachedData = current.vehicleCache[targetVin] || {};
  const debugLogFromCache =
    current.debugLogByVin?.[targetVin] || cachedData.debugLog || [];

  // Only skip refresh when cache still has fresh, real telemetry values
  const hasTelemetry = hasTelemetryValues(cachedData);

  // Merge: Current State -> Reset Telemetry -> Base State -> Cached Data
  vehicleStore.set({
    ...current,
    ...INITIAL_TELEMETRY,
    ...baseState,
    ...cachedData,
    vin: targetVin,
    debugLog: debugLogFromCache,
    isRefreshing: !hasTelemetry, // Only show loading if we don't have telemetry
  });

  // Refresh external enrichment for this VIN only when coordinates changed or cache expired.
  refreshLocationWeatherForVin(targetVin, cachedData);

  // 4. Switch MQTT subscription to new VIN (non-blocking — cached data already shown)
  getMqttClient()
    .switchVin(targetVin)
    .catch((err) => console.warn("switchVehicle: MQTT switch failed", err));

  // 5. Trigger Background Refresh (Only if no telemetry in cache)
  if (!hasTelemetry) {
    fetchTelemetry(targetVin);
  }
};

export const refreshVehicle = async (vin: string) => {
  if (!vin) return;
  const current = vehicleStore.get();

  // 1. Keep live data visible while refreshing.
  // Invalidate only freshness marker for the target VIN; avoid wiping current telemetry.
  const newCache = { ...current.vehicleCache };
  if (newCache[vin]) {
    const stale = { ...newCache[vin] };
    delete stale.lastUpdated;
    newCache[vin] = stale;
  }

  // 2. If target VIN has no cached entry, create minimal base cache record.
  if (!newCache[vin]) {
    const targetVehicle = current.vehicles.find((v) => v.vinCode === vin);
    if (targetVehicle) {
      newCache[vin] = getVehicleBaseState(targetVehicle, current);
    } else {
      newCache[vin] = { vin };
    }
  }

  vehicleStore.set({
    ...current,
    vehicleCache: newCache,
    isRefreshing: true,
  });

  // 3. Fetch fresh data for the requested vehicle
  await fetchTelemetry(vin);
};

export const fetchTelemetry = async (vin: string, isBackground = false) => {
  if (!vin) return;

  let success = false;

  const existing = telemetryFetchInFlight.get(vin);
  if (existing) return existing;

  const fetchTask = (async () => {
    telemetryInFlightCount += 1;

    if (telemetryInFlightCount === 1 && !isBackground) {
      // Set refreshing state only for first concurrent call and if not background.
      vehicleStore.setKey("isRefreshing", true);
      vehicleStore.setKey("isEnriching", true);
      setRefreshing(true);
    }

    try {
      const data = await api.getTelemetry(vin);
      if (data) {
        updateVehicleData({ ...data, vin }, { skipNullValues: true });
        const lat = toCoordNumber(data.latitude);
        const lon = toCoordNumber(data.longitude);
        const hasExtWeatherData =
          !!(data.location_address || data.weather_address) ||
          data.weather_outside_temp != null ||
          data.weather_code != null;
        if (isValidCoordPair(lat, lon) && !hasExtWeatherData) {
          void enrichLocationAndWeather(vin, lat, lon, false);
        }
        success = true;
      }
    } catch (e) {
      console.error("Telemetry Refresh Error", e);
    } finally {
      telemetryInFlightCount = Math.max(0, telemetryInFlightCount - 1);

      if (telemetryInFlightCount === 0 || !isBackground) {
        vehicleStore.setKey("isRefreshing", false);
        vehicleStore.setKey("isEnriching", false);
        setRefreshing(false);
      }

      if (success) {
        if (!isBackground) resetRefreshTimer(); // Reset timer only for active vehicle
        if (!vehicleStore.get().isInitialized) {
          vehicleStore.setKey("isInitialized", true);
        }
      }
    }
  })();

  telemetryFetchInFlight.set(vin, fetchTask);
  try {
    await fetchTask;
  } finally {
    if (telemetryFetchInFlight.get(vin) === fetchTask) {
      telemetryFetchInFlight.delete(vin);
    }
  }
};

export const prefetchOtherVehicles = async () => {
  const current = vehicleStore.get();
  const activeVin = current.vin;
  const otherVehicles = current.vehicles.filter((v) => v.vinCode !== activeVin);

  for (const v of otherVehicles) {
    if (!current.vehicleCache[v.vinCode]?.lastUpdated) {
      console.log(`Prefetching telemetry for background vehicle: ${v.vinCode}`);
      fetchTelemetry(v.vinCode, true);
    }
  }
};

export const fetchFullTelemetry = async (vin: string, force = false) => {
  if (!vin) return;
  const current = vehicleStore.get();
  const now = Date.now();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const lastFetch = current.fullTelemetryTimestamps[vin] || 0;
  const cachedData = current.fullTelemetryData[vin] || [];
  if (
    !force &&
    now - lastFetch < CACHE_DURATION &&
    Array.isArray(cachedData) &&
    cachedData.length >= MIN_DEEP_SCAN_CACHE_ITEMS
  ) {
    console.log("Using cached full telemetry for", vin);
    return;
  }

  vehicleStore.setKey("isScanning", true);

  try {
    // 1. Get Vehicle Info for Alias Version
    const vehicleInfo = current.vehicles.find((v) => v.vinCode === vin);
    const version = vehicleInfo?.vehicleAliasVersion || "1.0";
    console.log(
      `fetchFullTelemetry: vin=${vin}, version=${version}, foundInfo=${!!vehicleInfo}`,
    );

    // 2. Fetch Aliases
    let resources = await api.getAliases(vin, version);

    // Fallback if no resources found for the specific version
    if ((!resources || resources.length === 0) && version !== "1.0") {
      console.log(
        `fetchFullTelemetry: No aliases for version ${version}, trying fallback to 1.0`,
      );
      resources = await api.getAliases(vin, "1.0");
    }

    if (!resources || resources.length === 0) {
      console.error(
        "fetchFullTelemetry: No aliases (including fallback) returned from API",
        { vin },
      );
      throw new Error("No aliases found for vehicle");
    }

    console.log(`fetchFullTelemetry: Found ${resources.length} resources`);

    // --- DEEP SCAN: FIND INTERESTING ALIASES ---
    const interestingKeywords = [
      "SERVICE",
      "MAINTENANCE",
      "WARRANTY",
      "BOOKING",
      "APPOINTMENT",
      "NEXT",
      "SCHEDULE",
      "OTA",
      "UPDATE",
      "FIRMWARE",
      "VERSION",
      "ENERGY",
      "CONSUMPTION",
      "EFFICIENCY",
      "TRIP",
      "HISTORY",
      "NOTIFICATION",
      "ALERT",
      "ERROR",
      "FAULT",
      "DIAGNOSTIC",
      "RECALL",
      "CAMPAIGN",
    ];

    const getAliasField = (item: any, keys: string[]) => {
      const normalizedKeys = Object.keys(item || {}).reduce((acc: any, key) => {
        acc[key.toLowerCase()] = item[key];
        return acc;
      }, {});

      for (const key of keys) {
        if (item && item[key] != null && item[key] !== "") return item[key];
        const lower = key.toLowerCase();
        if (normalizedKeys[lower] != null && normalizedKeys[lower] !== "")
          return normalizedKeys[lower];
      }
      return "";
    };

    const candidates = resources.filter((r: any) => {
      const name = String(
        getAliasField(r, ["resourceName", "resource_name", "name", "deviceName"]),
      ).toUpperCase();
      const alias = String(
        getAliasField(r, [
          "alias",
          "aliasName",
          "alias_name",
          "displayName",
          "resourceAlias",
        ]),
      ).toUpperCase();
      return interestingKeywords.some(
        (keyword) => name.includes(keyword) || alias.includes(keyword),
      );
    });

    // Always store candidates (even if empty, to clear old data)
    console.log(
      `Deep Scan: Found ${candidates.length} interesting aliases`,
      candidates.slice(0, 10),
    );
    const currentState = vehicleStore.get();
    const currentCache = currentState.vehicleCache[vin] || {};
    const updatedCache = {
      ...currentState.vehicleCache,
      [vin]: {
        ...currentCache,
        debugLog: candidates,
      },
    };
    const updatedDebugLogByVin = {
      ...(currentState.debugLogByVin || {}),
      [vin]: candidates,
    };

    vehicleStore.setKey("debugLog", candidates);
    vehicleStore.setKey("debugLogByVin", updatedDebugLogByVin);
    vehicleStore.setKey("vehicleCache", updatedCache);
    // ------------------------------------------

    const candidateObjects = buildRequestObjects(candidates);
    const fallbackObjects = buildRequestObjects(resources);
    const cachedRequestObjects = buildRequestObjects(
      getCachedRequestObjects(vin, resources),
    );
    const useCachedRequest = cachedRequestObjects.length >= MIN_DEEP_SCAN_CACHE_ITEMS;
    const requestedObjects = useCachedRequest
      ? cachedRequestObjects
      : candidateObjects.length > 0
        ? candidateObjects
        : fallbackObjects;

    if (useCachedRequest) {
      console.log(
        `Deep Scan: Using cached request objects for ${vin}: ${requestedObjects.length}`,
      );
    }

    if (requestedObjects.length > 0) {
      const requestChunks = chunkList(
        requestedObjects,
        MQTT_DEEP_SCAN_REGISTER_BATCH_SIZE,
      );
      for (let i = 0; i < requestChunks.length; i += 1) {
        const chunk = requestChunks[i];
        await api.registerResources(vin, chunk);
        if (i + 1 < requestChunks.length) {
          await sleepMs(MQTT_DEEP_SCAN_RETRY_DELAY_MS);
        }
      }
    }

    const mqttSnapshot = getRawMqttTelemetry(vin);
    let readySnapshot = mqttSnapshot;
    if (!readySnapshot.length && requestedObjects.length > 0) {
      for (let retry = 0; retry < MQTT_DEEP_SCAN_RETRY_ROUNDS; retry += 1) {
        await sleepMs(MQTT_DEEP_SCAN_RETRY_DELAY_MS);
        readySnapshot = getRawMqttTelemetry(vin);
        if (readySnapshot.length > 0) break;
      }
    }

    const shouldRetryWithFullAlias =
      useCachedRequest &&
      fallbackObjects.length > 0 &&
      (readySnapshot.length === 0 ||
        readySnapshot.length <
          Math.max(
            MIN_DEEP_SCAN_CACHE_ITEMS,
            Math.floor(
              requestedObjects.length * MQTT_DEEP_SCAN_CACHE_FULL_RETRY_RATIO,
            ),
          ));

    if (shouldRetryWithFullAlias) {
      console.log(
        `Deep Scan: Cached request insufficient for ${vin} (${readySnapshot.length}/${requestedObjects.length}), retrying with full alias list (${fallbackObjects.length})`,
      );
      const fallbackChunks = chunkList(
        fallbackObjects,
        MQTT_DEEP_SCAN_REGISTER_BATCH_SIZE,
      );
      for (let i = 0; i < fallbackChunks.length; i += 1) {
        const chunk = fallbackChunks[i];
        await api.registerResources(vin, chunk);
        if (i + 1 < fallbackChunks.length) {
          await sleepMs(MQTT_DEEP_SCAN_RETRY_DELAY_MS);
        }
      }

      for (let retry = 0; retry < MQTT_DEEP_SCAN_RETRY_ROUNDS; retry += 1) {
        await sleepMs(MQTT_DEEP_SCAN_RETRY_DELAY_MS);
        readySnapshot = getRawMqttTelemetry(vin);
        if (readySnapshot.length > 0) break;
      }
    }

    if (!readySnapshot.length) {
      console.warn(
        `Deep Scan: No MQTT telemetry snapshot yet for ${vin}. Will keep existing cache and return.`,
      );
      if (current.fullTelemetryData[vin]?.length) {
        return;
      }
      console.warn(
        `Deep Scan: No MQTT telemetry snapshot yet for ${vin}. Open dashboard after receiving MQTT messages`,
      );
      return;
    }
    let rawData = readySnapshot;

      console.log(
        `[Deep Scan] MQTT snapshot mode: using ${rawData.length} items for ${vin}`,
        {
          requested: requestedObjects.length,
          snapshot: readySnapshot.length,
        },
    );

    if (!rawData.length) {
      console.warn("Deep scan returned no data", { vin });
      return;
    }

    // 5. Update Store & Cache
    const newFullData = { ...current.fullTelemetryData, [vin]: rawData };
    const newFullAliases = {
      ...current.fullTelemetryAliases,
      [vin]: resources,
    };
    const newTimestamps = { ...current.fullTelemetryTimestamps, [vin]: now };

    vehicleStore.setKey("fullTelemetryData", newFullData);
    vehicleStore.setKey("fullTelemetryAliases", newFullAliases);
    vehicleStore.setKey("fullTelemetryTimestamps", newTimestamps);
  } catch (e) {
    console.error("Full Telemetry Fetch Error", e);
  } finally {
    vehicleStore.setKey("isScanning", false);
  }
};

export const fetchUser = async () => {
  try {
    const data = await api.getUserProfile();
    if (data) {
      vehicleStore.setKey("user_name", data.name || data.sub);

      // Only set avatar from Auth0 if we don't have a specific VinFast profile image
      const current = vehicleStore.get();
      if (!current.vinfast_profile_image) {
        vehicleStore.setKey("user_avatar", data.picture);
      }
    }
  } catch (e) {
    console.error("User Fetch Error", e);
  }
};

export const fetchVehicles = async (): Promise<string | null> => {
  try {
    const vehicles = await api.getVehicles();

    if (vehicles && vehicles.length > 0) {
      // Deduplicate vehicles based on vinCode
      const uniqueVehicles = Array.from(
        new Map(vehicles.map((v: any) => [v.vinCode, v])).values(),
      );
      const normalizedVehicles = uniqueVehicles.map((v: any) => ({
        ...v,
        batteryCapacity: parseBatteryCapacityKwh(v),
      }));

      // Store all vehicles
      vehicleStore.setKey("vehicles", normalizedVehicles);

      // Populate Cache with Initial Info for all vehicles
      const cache: Record<string, Partial<VehicleState>> = {};
      normalizedVehicles.forEach((v: any) => {
        cache[v.vinCode] = {
          vin: v.vinCode,
          marketingName: v.marketingName,
          vehicleVariant: v.vehicleVariant,
          color: v.exteriorColor || v.color,
          interiorColor: v.interiorColor,
          yearOfProduct: v.yearOfProduct,
          customizedVehicleName: v.customizedVehicleName || v.vehicleName,
          userVehicleType: v.userVehicleType,
          vehicleImage: v.vehicleImage,
          warrantyExpirationDate: v.warrantyExpirationDate,
          warrantyMileage: v.warrantyMileage,
          battery_capacity_kwh: v.batteryCapacity ?? null,
        };
      });
      vehicleStore.setKey("vehicleCache", cache);

      // Automatically switch to the first vehicle
      const firstVin = vehicles[0].vinCode;
      await switchVehicle(firstVin);

      // Prefetch other vehicles in background
      prefetchOtherVehicles();

      return firstVin;
    }
    return null;
  } catch (e) {
    console.error("Fetch Vehicles Error", e);
    return null;
  }
};

// --- MQTT Live Updates ---

export const updateFromMqtt = (
  vin: string,
  parsedData: Partial<VehicleState>,
  rawMessages?: any[],
) => {
  ingestMqttTelemetry(vin, rawMessages || []);
  if (!vin || !parsedData || Object.keys(parsedData).length === 0) return;

  updateVehicleData({ ...parsedData, vin } as Partial<VehicleState>);

  const latitude = toCoordNumber(parsedData.latitude);
  const longitude = toCoordNumber(parsedData.longitude);
  if (isValidCoordPair(latitude, longitude)) {
    void enrichLocationAndWeather(vin, latitude, longitude, false);
  }
};

export const getCachedMqttTelemetryCatalog = () => {
  loadMqttTelemetryCatalog();
  return Object.fromEntries(
    [...mqttTelemetryCatalog.entries()].map(([vin, entry]) => ({
      ...entry,
      vin,
    })),
  ) as Record<string, MqttTelemetryCatalogEntry>;
};

export const getMqttTelemetryCatalogForVin = (vin: string) => {
  if (!vin) return [];
  return getCachedTelemetryKeys(vin);
};

export const clearMqttTelemetryCatalogForVin = (vin?: string) => {
  clearCachedTelemetryCatalog(vin);
  if (vin) {
    mqttRawTelemetryByVin.delete(vin);
  } else {
    mqttRawTelemetryByVin.clear();
  }
};

export const getLiveMqttKeysForVin = (vin: string): string[] => {
  if (!vin) return [];
  return getCachedTelemetryKeys(vin);
};

export const getLiveMqttSnapshotForVin = (vin: string) => {
  if (!vin) return [];
  const snapshot = getRawMqttTelemetry(vin);
  return snapshot.map((item: any) => ({
    key: normalizeTelemetryKey(item),
    deviceKey: item?.deviceKey || item?.device_key || item?.path || "",
    value: item?.value ?? item?.Value,
    raw: item,
  }));
};

export const buildMqttTelemetryInspectorReport = (vin?: string) => {
  if (vin) {
    return {
      vin,
      catalogKeys: getLiveMqttKeysForVin(vin),
      snapshotKeys: getLiveMqttSnapshotForVin(vin).map((item) => item.key),
      snapshotCount: getRawMqttTelemetry(vin).length,
    };
  }

  const catalog = getCachedMqttTelemetryCatalog();
  const all: Record<
    string,
    { catalogKeys: string[]; snapshotKeys: string[]; snapshotCount: number }
  > = {};

  Object.keys(catalog).forEach((cachedVin) => {
    const snapshot = getLiveMqttSnapshotForVin(cachedVin);
    all[cachedVin] = {
      catalogKeys: catalog[cachedVin]?.keys || [],
      snapshotKeys: snapshot.map((item) => item.key),
      snapshotCount: snapshot.length,
    };
  });

  return all;
};

const isProductionMode =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

if (!isProductionMode && typeof window !== "undefined") {
  (window as any).__vfMqttTelemetry = {
    getMqttTelemetryCatalog: getCachedMqttTelemetryCatalog,
    getMqttTelemetryCatalogForVin,
    getLiveMqttKeysForVin,
    getLiveMqttSnapshotForVin,
    buildMqttTelemetryInspectorReport,
    clearMqttTelemetryCatalogForVin,
  };
}
