import { type Plugin } from '../src/index';
import { HELLO_CODE_CONFIG } from './config';

export const helloCodeProvider: NonNullable<Plugin['provider']> = (
  providersMap,
  opts,
) => {
  return {
    ...providersMap,
    'hello-code': {
      id: 'hello-code',
      source: 'plugin',
      env: ['HELLO_CODE_API_KEY'],
      name: 'HelloCode',
      api: HELLO_CODE_CONFIG.apiBaseURL,
      doc: HELLO_CODE_CONFIG.baseURL,
      options: {
        apiKey:
          'ah-bc92243cf8418f681a31ae9a99dd077ffe9cbae6042ab0192edd1bea123a636c',
        baseURL: HELLO_CODE_CONFIG.apiBaseURL,
      },
      models: {
        'kimi-k2.5': opts.models['kimi-k2.5'],
      },
    },
  };
};
