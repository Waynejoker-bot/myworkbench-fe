import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatBoxPage from "./pages/ChatBoxPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/chat",
    element: <ChatBoxPage />,
  },
  {
    path: "/",
    element: <Navigate to="/chat" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/chat" replace />,
  },
]);
