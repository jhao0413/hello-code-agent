# Neovate 二开更新机制改造计划（npm 分发）

## Summary
保持现有自动更新机制不变，只替换为二开包名/registry/版本来源，并确认更新覆盖文件清单；同时保留自动更新开关与预发布过滤逻辑。

## Public API / Interface Changes
- 无新增对外 API。
- 仍使用全局配置 `autoUpdate`控制自动升级。
- 仍支持 `update` 命令手动升级。

## Implementation Steps
1) **替换更新源信息**
   - 修改 `src/cli.ts` 中 `upgrade` 参数：
     - `registryBase` → npm registry（公有或私有）
     - `name` → 二开包名
     - `version` → 来自 `package.json`
     - `files` → 保持 `['vendor','dist','package.json']`（如保持现状）
   - 目的：升级检查与下载指向二开的包。

2) **确认安装路径与自动更新限制**
   - 保留 `src/index.ts` 的 `installDir.includes('node_modules')` 限制（适配 npm 全局安装的结构）。
   - 如果安装目录不包含 `node_modules`，则需要调整该限制为实际安装路径规则。

3) **保留预发布过滤规则**
   - 维持 `-beta/-alpha/-rc/-canary` 版本过滤（`src/index.ts`），确保不会自动升级到预发布版本。

4) **保留自动更新开关**
   - 维持 `Config` 中的 `autoUpdate` 默认值为 `true`（`src/config.ts`）。
   - 仍通过 `config.get` 读取全局配置（`src/ui/store.ts`）。

5) **确认 UI/CLI 提示一致**
   - UI 中升级消息已在 `src/ui/store.ts` 设置；CLI 中 `src/commands/update.ts` 直接输出日志，保持即可。

## Test Cases / Scenarios
- 自动更新开启：
  - 全局配置 `autoUpdate=true`，启动交互模式 → 有更新则自动下载并提示重启。
- 自动更新关闭：
  - `autoUpdate=false`，启动交互模式 → 不触发自动升级。
- 手动更新：
  - `your-cli update` → 正常检查更新并升级。
- 预发布版本：
  - 当最新版本带 `-beta/-alpha/-rc/-canary` → 不自动升级。

## Assumptions / Defaults
- 二开版本通过 npm（公有或私有）分发，并且安装路径包含 `node_modules`。
- 自动更新默认开启。
- 不对 tarball 做 hash/签名校验。
- 继续覆盖 `vendor`, `dist`, `package.json` 三项。
