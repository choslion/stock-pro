import "./App.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import ToastContainer from "./components/ui/ToastContainer";
import StockIndexLayout from "./components/StockIndexLayout";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <StockIndexLayout />
    </QueryClientProvider>
  );
}

export default App;
