import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // 表单验证
    if (!username.trim()) {
      setError("请输入用户名");
      return;
    }
    if (!password.trim()) {
      setError("请输入密码");
      return;
    }

    setIsLoading(true);

    try {
      await login(username.trim(), password.trim());
      navigate("/chat", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-card"
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 bg-surface-2 border border-border"
      >
        {/* Brand */}
        <h1
          className="text-3xl font-bold text-center mb-8 font-display"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ARMfn
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username input */}
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors bg-muted border border-border text-foreground"
            />
          </div>

          {/* Password input */}
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className={`w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors bg-muted text-foreground border ${error ? "border-destructive" : "border-border"}`}
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            className="w-full py-3 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 bg-primary"
          >
            {isLoading ? "登录中..." : "登录"}
          </button>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="font-medium hover:underline text-primary"
            >
              立即注册
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
