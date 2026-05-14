import axios from "axios";
import { useToastStore } from "../store/useToastStore";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 61000,
});

axiosInstance.interceptors.response.use(
  res => res,
  error => {
    const status = error.response?.status;

    let message;
    if (!error.response) {
      message = "서버에 연결할 수 없습니다. (네트워크 오류)";
    } else {
      message = {
        400: "잘못된 요청입니다.",
        404: "요청한 리소스를 찾을 수 없습니다.",
        500: "서버 에러입니다.",
      }[status] ?? "알 수 없는 오류가 발생했습니다.";
    }

    useToastStore.getState().addToast(message, "error");
    console.log(`[API ERROR] ${status ?? "NETWORK_ERROR"}`);

    return Promise.reject(error);
  }
);

export default axiosInstance;
