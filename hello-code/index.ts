import { parseArgs, type Plugin, runNeovate } from '../src/index';

const HELLO_CODE_ASCII_ART = `
█ █ █▀▀ █   █   █▀█   █▀▀ █▀█ █▀▄ █▀▀
█▀█ ██▄ █▄▄ █▄▄ █▄█   █▄▄ █▄█ █▄▀ ██▄
`.trim();

const helloCodePlugin: Plugin = {
  config({ config, argvConfig }) {
    return {
      model: argvConfig.model || config.model || 'cc/claude-opus-4-5',
      smallModel:
        argvConfig.smallModel ||
        config.smallModel ||
        argvConfig.model ||
        'cc/claude-haiku-4-5',
    };
  },
  provider(memo, opts) {
    return {
      cc: {
        id: 'cc',
        env: ['HELLO_CODE_API_KEY'],
        name: 'cc',
        doc: 'https://hello-code.com',
        models: {
          'claude-opus-4-5': opts.models['claude-opus-4-5'],
          'claude-haiku-4-5': opts.models['claude-haiku-4-5'],
        },
        createModel(name, _provider) {
          return opts
            .createAnthropic({
              apiKey: process.env.HELLO_CODE_API_KEY || '',
              baseURL: process.env.HELLO_CODE_BASE_URL || undefined,
            })
            .chat(name);
        },
      },
      ...memo,
    };
  },
};

const argv = await parseArgs(process.argv.slice(2));

runNeovate({
  productName: 'HelloCode',
  productASCIIArt: HELLO_CODE_ASCII_ART,
  version: '0.1.0',
  plugins: [helloCodePlugin],
  argv,
}).catch(console.error);
