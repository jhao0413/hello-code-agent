import type { SlashCommand } from '../src/slash-commands/types';
import type { Context } from '../src/context';
import { ConfigManager } from '../src/config';
import { HELLO_CODE_CONFIG } from './config';

/**
 * 验证 HelloCode API key 格式并通过服务器验证
 */
async function validateHelloCodeApiKey(apiKey: string): Promise<{
  valid: boolean;
  error?: string;
  userId?: string;
  email?: string;
  name?: string;
}> {
  const helloCodeKeyPattern = /^hc_[a-z2-7]{24,}$/;
  if (!helloCodeKeyPattern.test(apiKey)) {
    return {
      valid: false,
      error: '无效的 API key 格式。期望格式: hc_[a-z2-7]{24,}',
    };
  }

  const verifyURL = `${HELLO_CODE_CONFIG.baseURL}${HELLO_CODE_CONFIG.endpoints.verifyKey}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(verifyURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP ${response.status}`;
      return { valid: false, error: `验证失败: ${errorMessage}` };
    }

    const data = await response.json();
    return {
      valid: true,
      userId: data.user?.id || '',
      email: data.user?.email || '',
      name: data.user?.name || '',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, error: '验证超时，请检查网络连接' };
    }
    return {
      valid: false,
      error: `网络错误: ${error instanceof Error ? error.message : error}`,
    };
  }
}

/**
 * 掩码 API key，只显示前6位和后4位
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 10) {
    return '*'.repeat(apiKey.length);
  }
  return `${apiKey.slice(0, 6)}${'*'.repeat(apiKey.length - 10)}${apiKey.slice(-4)}`;
}

function getConfigManager(context: Context): ConfigManager {
  return new ConfigManager(
    context.cwd,
    context.productName,
    context.argvConfig,
  );
}

export function createHelloCodeSlashCommands(): SlashCommand[] {
  return [
    {
      type: 'local',
      name: 'hc-login',
      description: '登录 HelloCode 账号',
      async call(args: string, context: Context) {
        const apiKey = args.trim();

        if (!apiKey) {
          return '请提供 API key，格式: /hc-login <api-key>';
        }

        const validation = await validateHelloCodeApiKey(apiKey);

        if (!validation.valid) {
          return `✗ ${validation.error}`;
        }

        // 保存用户信息到 extensions 配置（一次性设置整个对象）
        const configManager = getConfigManager(context);

        try {
          const extensions = configManager.getConfig(true, 'extensions') || {};
          configManager.setConfig(true, 'extensions', {
            ...extensions,
            hellocode: {
              user: {
                apiKey,
                userId: validation.userId || '',
                email: validation.email || '',
                name: validation.name || '',
                loginAt: new Date().toISOString(),
              },
            },
          });

          const userMessage =
            validation.email || validation.name || validation.userId;
          return `✓ 成功登录 HelloCode。用户: ${userMessage}`;
        } catch (error) {
          return `✗ 保存用户信息失败: ${error}`;
        }
      },
    },
    {
      type: 'local',
      name: 'hc-logout',
      description: '退出 HelloCode 账号',
      async call(_args: string, context: Context) {
        const configManager = getConfigManager(context);

        try {
          const extensions = configManager.getConfig(true, 'extensions') || {};
          configManager.setConfig(true, 'extensions', {
            ...extensions,
            hellocode: {
              user: undefined,
            },
          });

          return '✓ 成功退出 HelloCode';
        } catch (error) {
          return `✗ 退出 HelloCode 失败: ${error}`;
        }
      },
    },
    {
      type: 'local',
      name: 'hc-status',
      description: '查看 HelloCode 登录状态',
      async call(_args: string, context: Context) {
        const configManager = getConfigManager(context);

        const extensions = configManager.getConfig(true, 'extensions') || {};
        const user = extensions?.hellocode?.user;

        if (!user) {
          return '未登录 HelloCode，使用 /hc-login <api-key> 登录';
        }

        const { email, name, userId, apiKey, loginAt } = user;
        const userInfo = [name, email, userId].filter(Boolean).join(' | ');
        const maskedKey = apiKey ? maskApiKey(apiKey) : 'N/A';
        const loginTime = loginAt
          ? new Date(loginAt).toLocaleString('zh-CN')
          : '未知';

        return `已登录 HelloCode: ${userInfo}\nAPI Key: ${maskedKey}\n登录时间: ${loginTime}`;
      },
    },
  ];
}
