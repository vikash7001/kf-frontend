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

  put(path, data) {
    return apiInstance.put(path, data);
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

export function getOnlineOrders() {
  return api.get("/online-orders");
}

export function importOnlineOrders(data) {
  return api.post(
    "/online-orders/import",
    data
  );
}