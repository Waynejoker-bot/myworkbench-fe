import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // 表单验证
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) {
      setError("请输入用户名");
      return;
    }
    if (trimmedUsername.length < 3) {
      setError("用户名至少需要3个字符");
      return;
    }
    if (!trimmedPassword) {
      setError("请输入密码");
      return;
    }
    if (trimmedPassword.length < 6) {
      setError("密码至少需要6个字符");
      return;
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      setError("两次输入的密码不一致");
      return;
    }

    setIsLoading(true);

    try {
      await register(trimmedUsername, trimmedPassword);
      showToast("注册成功！请登录", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
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
          className="text-3xl font-bold text-center mb-2 font-display"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ARMfn
        </h1>
        <p className="text-center mb-6 text-muted-foreground text-sm">
          创建新账号
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username input */}
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名（至少3个字符）"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors bg-muted border border-border text-foreground"
            />
          </div>

          {/* Password input */}
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少6个字符）"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors bg-muted border border-border text-foreground"
            />
          </div>

          {/* Confirm password input */}
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
              className={`w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors bg-muted text-foreground border ${
                error && confirmPassword && password !== confirmPassword
                  ? "border-destructive"
                  : "border-border"
              }`}
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
            disabled={isLoading}
            className="w-full py-3 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 bg-primary"
          >
            {isLoading ? "注册中..." : "注册"}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium hover:underline text-primary"
            >
              立即登录
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
