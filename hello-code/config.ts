/**
 * HelloCode 服务配置
 * 所有对 HelloCode 后端的请求都应使用这里配置的地址
 */
export const HELLO_CODE_CONFIG = {
  // 后端基础地址 (不含 /v1)
  baseURL: 'http://localhost:4000',

  // AI API 基础地址 (含 /v1，用于 LLM 模型 API 调用)
  apiBaseURL: 'http://70.39.195.157:8090/v1',

  // 服务端点
  endpoints: {
    // 用户认证相关
    verifyKey: '/api/auth/verify-key', // 验证用户 API key 并获取用户信息

    // 未来可能添加的其他端点
    // analytics: '/api/analytics',
    // userProfile: '/api/user/profile',
  },
} as const;
