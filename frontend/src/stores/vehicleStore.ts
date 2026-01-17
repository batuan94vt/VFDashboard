import { map } from "nanostores";
import { ENDPOINTS } from "../config/api";
import { DEFAULT_LOCATION } from "../constants/vehicle";

export interface VehicleState {
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

  // Climate
  outside_temp?: number | null;
  inside_temp?: number | null; // From Telemetry
  fan_speed?: number | null;

  // ECU
  bms_version?: string;
  gateway_version?: string;
  ecu_head_unit?: string;
  ecu_audio_amp?: string;
  ecu_connectivity?: string;
  ecu_nav?: string;
  ecu_driver_monitoring?: string;
  ecu_camera?: string;
  ecu_lighting?: string;
  ecu_tailgate?: string;
  ecu_door_control?: string;
  ecu_seat_control?: string;

  // Detailed Versions
  mhu_version?: string;
  vcu_version?: string;
  bcm_version?: string;

  // System Health / Vehicle Status
  firmware_version?: string;
  tbox_version?: string;
  thermal_warning?: string | number; // 1 = Warning, 0 = Normal
  service_alert?: string | number;

  // Driving Stats
  driving_time?: number | null; // Seconds or Minutes? Usually seconds.
  central_lock_status?: boolean; // True=Locked?

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
  battery_type?: string;
  battery_serial?: string | null;
  battery_manufacture_date?: string | null;

  lastUpdated: number;
  isRefreshing?: boolean;
}

// Demo Mode / Default State
export const vehicleStore = map<VehicleState>({
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

  // Battery Details (Module C)
  target_soc: null,
  remaining_charging_time: null,
  soh_percentage: null,
  battery_health_12v: null,
  battery_type: "--",
  battery_serial: null,
  battery_manufacture_date: null,

  // ECU
  bms_version: "--",
  gateway_version: "--",
  ecu_head_unit: "--",
  ecu_audio_amp: "--",
  ecu_connectivity: "--",
  ecu_nav: "--",
  ecu_driver_monitoring: "--",
  ecu_camera: "--",
  ecu_lighting: "--",
  ecu_tailgate: "--",
  ecu_door_control: "--",
  ecu_seat_control: "--",

  mhu_version: "--",
  vcu_version: "--",
  bcm_version: "--",

  driving_time: null,
  central_lock_status: undefined,

  // Warranty
  warrantyExpirationDate: null,
  warrantyMileage: null,

  // Vehicle Status
  firmware_version: "--",
  tbox_version: "--",
  thermal_warning: 0,
  service_alert: 0,

  lastUpdated: Date.now(),
  isRefreshing: false,
});

export const updateVehicleData = (data: Partial<VehicleState>) => {
  const current = vehicleStore.get();
  vehicleStore.set({ ...current, ...data, lastUpdated: Date.now() });
};

export const fetchTelemetry = async (vin: string) => {
  if (!vin) return;

  // Set refreshing state
  vehicleStore.setKey("isRefreshing", true);

  try {
    const res = await fetch(ENDPOINTS.TELEMETRY(vin), {
      credentials: "include",
    });

    if (res.status === 401) {
      console.warn("Telemetry 401 Unauthorized - Redirecting to Login");
      if (typeof window !== "undefined") window.location.href = "/login";
      return;
    }

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        updateVehicleData(json.data);
      } else {
        console.warn("Telemetry response ok but no data field", json);
      }
    } else {
      console.error("Telemetry fetch failed", res.status, res.statusText);
    }
  } catch (e) {
    console.error("Telemetry Refresh Error", e);
  } finally {
    vehicleStore.setKey("isRefreshing", false);
  }
};

export const fetchUser = async () => {
  try {
    const res = await fetch(ENDPOINTS.USER, {
      credentials: "include",
    });

    if (res.status === 401) {
      console.warn("User Fetch 401 Unauthorized - Redirecting to Login");
      if (typeof window !== "undefined") window.location.href = "/login";
      return;
    }

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        vehicleStore.setKey("user_name", json.data.name || json.data.sub);

        // Only set avatar from Auth0 if we don't have a specific VinFast profile image
        const current = vehicleStore.get();
        if (!current.vinfast_profile_image) {
          // Filter out Gravatar if desired, or let Header handle it.
          // But user specifically said "Currently there is one but it is being overwritten".
          // So we simply respect the VinFast one if it exists.
          vehicleStore.setKey("user_avatar", json.data.picture);
        }
      }
    }
  } catch (e) {
    console.error("User Fetch Error", e);
  }
};

export const fetchVehicles = async (): Promise<string | null> => {
  try {
    const res = await fetch(ENDPOINTS.VEHICLES, {
      credentials: "include",
    });

    if (res.status === 401) {
      console.warn("Vehicles Fetch 401 Unauthorized - Redirecting to Login");
      if (typeof window !== "undefined") window.location.href = "/login";
      return null;
    }

    if (res.ok) {
      const json = await res.json();
      // console.log("DEBUG: fetchVehicles response:", json);
      if (json.data && json.data.length > 0) {
        const vehicle = json.data[0];
        const firstVin = vehicle.vinCode;
        vehicleStore.setKey("vin", firstVin);

        // Store extended info for Header
        vehicleStore.setKey("marketingName", vehicle.marketingName);
        vehicleStore.setKey("vehicleVariant", vehicle.vehicleVariant);
        vehicleStore.setKey("color", vehicle.exteriorColor || vehicle.color);
        vehicleStore.setKey("yearOfProduct", vehicle.yearOfProduct);
        vehicleStore.setKey("yearOfProduct", vehicle.yearOfProduct);
        vehicleStore.setKey(
          "customizedVehicleName",
          vehicle.customizedVehicleName || vehicle.vehicleName,
        );
        vehicleStore.setKey("userVehicleType", vehicle.userVehicleType);

        // User Request: Use profileImage from user-vehicle API
        if (vehicle.profileImage) {
          vehicleStore.setKey("vinfast_profile_image", vehicle.profileImage);
          vehicleStore.setKey("user_avatar", vehicle.profileImage);
        }

        // Warranty
        vehicleStore.setKey(
          "warrantyExpirationDate",
          vehicle.warrantyExpirationDate,
        );
        vehicleStore.setKey("warrantyMileage", vehicle.warrantyMileage);

        return firstVin;
      }
    }
    return null;
  } catch (e) {
    console.error("Fetch Vehicles Error", e);
    return null;
  }
};
