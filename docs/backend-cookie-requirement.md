# 登录认证 Cookie 需求

## 背景

前端项目已实现统一的登录认证机制，现在需要在后端配合设置 Cookie，以支持前端通过浏览器自动携带认证信息。

## 需求

### 1. 登录接口 `/api/auth/login`

登录成功后，后端需要在响应中设置认证 Cookie：

```
Set-Cookie: access_token=<token值>; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=<过期时间>
```

**关键点**：
- `HttpOnly`：必须设置，防止 JS 读取（安全）
- `SameSite=None`：允许跨域发送 Cookie
- `Secure`：在 HTTPS 下必须，建议生产环境开启
- `Path=/`：全局生效
- `Max-Age`：与 token 过期时间一致

### 2. 可选：登出接口 `/api/auth/logout`

登出时清除 Cookie：

```
Set-Cookie: access_token=; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=0
```

### 3. CORS 配置

确保后端 CORS 允许携带凭证：

```python
# Python/FastAPI 示例
allow_credentials = True
allow_origins = ["前端域名"]  # 不使用 *
```

## 验证方式

前端在请求中加 `credentials: 'include'`，浏览器会自动带上 Cookie，无需手动设置 Authorization header。

---

如有疑问请联系前端开发者。
