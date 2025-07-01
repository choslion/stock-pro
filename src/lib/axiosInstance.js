import axios from "axios";
import { useToastStore } from "../store/useToastStore";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

axiosInstance.interceptors.response.use(
  res => res,
  error => {
    console.log(error.response.config.url);
    
    const status = error.response?.status;
    const baseMessage =
      {
        400: "잘못된 요청입니다.",
        // 401: "로그인이 필요합니다.",
        // 403: "접근 권한이 없습니다.",
        404: "요청한 리소스를 찾을 수 없습니다.",
        500: "서버 에러입니다.",
      }[status] || "알 수 없는 오류가 발생했습니다.";

    const errComponentUrl = error.response?.config?.url || "";
    const endpoint = errComponentUrl.split("/").filter(Boolean).pop();
    const message = endpoint ? `${baseMessage} (${endpoint})` : baseMessage;

    // 🚀 UI 렌더 이후에 에러 토스트 출력
    setTimeout(() => {
      useToastStore.getState().addToast(message, "error");
      console.log(message);
      
    }, 0);

    return Promise.reject(error);
  }
);

export default axiosInstance;
