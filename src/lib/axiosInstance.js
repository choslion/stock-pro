// lib/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000, // 10초 timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
// interceptors 설정해서 토큰 자동삽입, 공통에러핸들링 가능하는거 고려
export default axiosInstance;
