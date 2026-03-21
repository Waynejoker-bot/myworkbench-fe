import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "./contexts/AuthContext";
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
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
