import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/ui/Toast";
import { ThemeProvider } from "./components/ui/theme-toggle";
import { useEffect } from "react";

// 使用 router.subscribe 监听路由变化
function useBaiduTongji() {
  useEffect(() => {
    const unsubscribe = router.subscribe((state) => {
      if (window._hmt && state.location) {
        window._hmt.push(["_trackPageview", state.location.pathname]);
      }
    });
    return unsubscribe;
  }, []);
}

function App() {
  useBaiduTongji();

  return (
    <ThemeProvider>
      <ToastProvider>
        <ToastContainer />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
