import axios from "axios";

const BASE =
  process.env.REACT_APP_API_URL ||
  "https://site--kf-backend-api--844vk4b7xzxp.code.run";

const apiInstance = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =====================================================
   CORE API WRAPPER
===================================================== */

const api = {
  setToken(token) {
    if (token) {
      apiInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete apiInstance.defaults.headers.common["Authorization"];
    }
  },

  get(path, params) {
    return apiInstance.get(path, { params });
  },

  post(path, data) {
    return apiInstance.post(path, data);
  },
};

export { api };
export default api;

/* =====================================================
   EXISTING MODULES (UNCHANGED)
===================================================== */

export function postIncoming(data) {
  return apiInstance.post("/incoming", data);
}

export function postSales(data) {
  return apiInstance.post("/sales", data);
}

/* =====================================================
   FABRIC / PRODUCTION MODULE
===================================================== */

// 🔹 Fabric Incoming
export function postFabricIncoming(data) {
  return apiInstance.post("/fabric/incoming", data);
}

// 🔹 Fabric Movement (Issue to Job Worker)
export function postFabricMovement(data) {
  return apiInstance.post("/fabric/movement", data);
}

// 🔹 Live Production Dashboard
export function getFabricDashboard() {
  return apiInstance.get("/fabric/dashboard/live");
}

// 🔹 Vendors Master
export function getVendors() {
  return apiInstance.get("/vendors");
}

// 🔹 Locations Master
export function getLocations() {
  return apiInstance.get("/locations");
}

export function getAvailableLots() {
  return apiInstance.get("/fabric/lots/available");
}
export function getJobWorkers() {
  return apiInstance.get("/jobworkers");
}

