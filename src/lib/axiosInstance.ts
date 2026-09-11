import axios, { AxiosError } from "axios";
import { useToastStore } from "../store/useToastStore";

declare module "axios" {
  interface AxiosRequestConfig {
    suppressErrorToast?: boolean;
  }
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 61000,
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;

    let message: string;
    if (!error.response) {
      message = "서버에 연결할 수 없습니다. (네트워크 오류)";
    } else {
      const statusMessages: Record<number, string> = {
        400: "잘못된 요청입니다.",
        404: "요청한 리소스를 찾을 수 없습니다.",
        429: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
        500: "서버 에러입니다.",
        503: "외부 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
      message = (status !== undefined ? statusMessages[status] : undefined)
        ?? "알 수 없는 오류가 발생했습니다.";
    }

    // React Query 조회는 자체 재시도와 화면별 최종 오류 UI가 있다.
    // 첫 번째 일시적 실패를 최종 오류처럼 알리지 않도록 해당 요청의 토스트는 생략한다.
    if (!error.config?.suppressErrorToast) {
      useToastStore.getState().addToast(message, "error");
    }
    console.log(`[API ERROR] ${status ?? "NETWORK_ERROR"}`);

    return Promise.reject(error);
  },
);

export default axiosInstance;
