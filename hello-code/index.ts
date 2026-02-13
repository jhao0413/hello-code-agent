#!/usr/bin/env node
import { type Plugin, parseArgs, runNeovate } from '../src/index';
import { helloCodeProvider } from './provider';
import { createHelloCodeSlashCommands } from './slash-command';

const HELLO_CODE_ASCII_ART = `
█ █ █▀▀ █   █   █▀█   █▀▀ █▀█ █▀▄ █▀▀
█▀█ ██▄ █▄▄ █▄▄ █▄█   █▄▄ █▄█ █▄▀ ██▄
`.trim();

const helloCodePlugin: Plugin = {
  config({ config, argvConfig }) {
    return {
      model: argvConfig.model || config.model || 'hello-code/kimi-k2.5',
      smallModel:
        argvConfig.smallModel ||
        config.smallModel ||
        argvConfig.model ||
        'hello-code/kimi-k2.5',
    };
  },
  provider: helloCodeProvider,
  slashCommand() {
    return createHelloCodeSlashCommands();
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
