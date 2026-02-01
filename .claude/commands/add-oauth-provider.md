---
name: Add OAuth Provider
description: Create a new OAuth provider with login and related logic
---

Add a new OAuth provider named $ARGUMENTS following the patterns in:

1. **Provider definition** (`src/provider/providers/<provider>.ts`):
   - Create provider with `id`, `name`, `doc`, `models`
   - Add `createModel` function for OAuth token handling:
     - Parse apiKey as JSON to get account state
     - Use provider class from `oauth-providers` for token refresh
     - Save refreshed token back to global config
     - Create OpenAI-compatible client with Bearer token auth
   - Reference: @src/provider/providers/qwen.ts

2. **Export provider** (`src/provider/providers/index.ts`):
   - Add export statement
   - Add import statement  
   - Add to `providers` map

3. **Login UI** (`src/slash-commands/builtin/login.tsx`):
   - Add provider id to `OAuthState.providerId` type union
   - Add provider to OAuth condition checks
   - Add provider-specific title and waiting message

4. **OAuth handlers** (`src/nodeBridge/slices/providers.ts`):
   - Import provider class from `oauth-providers`
   - Update `OAuthSession.provider` type union
   - Add case in `providers.login.initOAuth` handler
   - Add case in `providers.login.pollOAuth` handler
   - Add case in `providers.login.completeOAuth` handler
   - Add provider to `providers.login.status` handler check
   - Add provider to `normalizeProviders` OAuth user extraction

Run typecheck after implementation.
