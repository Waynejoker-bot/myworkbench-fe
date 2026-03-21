import { createBrowserRouter, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import FileSystemPage from "./pages/FileSystemPage";
import ChatBoxPage from "./pages/ChatBoxPage";
import FourierDrawPage from "./pages/FourierDrawPage";
// 小说相关页面
import BookshelfPage from "./pages/novel/BookshelfPage";
import BookDetailPage from "./pages/novel/BookDetailPage";
import ReaderPage from "./pages/novel/ReaderPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ChatBoxPage />,
  },
  {
    path: "/home",
    element: <HomePage />,
  },
  {
    path: "/chat",
    element: <ChatBoxPage />,
  },
  {
    path: "/fs",
    element: <FileSystemPage />,
  },
  {
    path: "/fourier",
    element: <FourierDrawPage />,
  },
  // 小说相关路由
  {
    path: "/novel",
    element: <BookshelfPage />,
  },
  {
    path: "/novel/:bookId",
    element: <BookDetailPage />,
  },
  {
    path: "/novel/:bookId/:chapterId",
    element: <ReaderPage />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
