import axios from "axios";
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

export function postIncoming(data) {
  return apiInstance.post("/incoming", data);
}

export function postSales(data) {
  return apiInstance.post("/sales", data);
}
