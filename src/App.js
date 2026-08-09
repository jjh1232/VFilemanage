import React from 'react';
import MainLAYOUT from './Layout/MAINLAYOUT';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,  // Electron은 로컬이니까 재시도 1번만
      staleTime: 5 * 60 * 1000  // 5분 캐시
    }
  }
});

function App() {
  return (
      <QueryClientProvider client={queryClient}>
  <MainLAYOUT />
  </QueryClientProvider>
  );
}
export default App;