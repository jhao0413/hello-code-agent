# HelloCode

HelloCode CLI - AI coding agent powered by Neovate

## 🚀 Quick Start

### Development

```bash
# Run in development mode
bun run dev

# Type check
bun run typecheck
```

### Build

```bash
# Build regular JS bundle
bun run build

# Build standalone executable (includes Bun runtime)
bun run build:standalone

# Clean build artifacts
bun run clean
```

### Configuration

Set your API key in `.env`:

```bash
HELLO_CODE_API_KEY=your-api-key-here
HELLO_CODE_BASE_URL=https://api.hello-code.com  # optional
```

## 📦 Distribution

The built CLI can be distributed via:
- **npm package**: `dist/index.js` (requires Node.js/Bun)
- **Standalone binary**: `dist/hello-code` (no runtime needed)

## 🔗 Links

- [HelloCode Website](https://hello-code.com)
- [Neovate Code](https://neovateai.dev)

## 📝 License

MIT
