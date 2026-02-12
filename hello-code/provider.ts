import { type Plugin } from '../src/index';

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
      api: 'http://70.39.195.157:8090/v1',
      doc: 'http://70.39.195.157:8090',
      options: {
        apiKey:
          'ah-bc92243cf8418f681a31ae9a99dd077ffe9cbae6042ab0192edd1bea123a636c',
        baseURL: 'http://70.39.195.157:8090/v1',
      },
      models: {
        'kimi-k2.5': opts.models['kimi-k2.5'],
      },
    },
  };
};
