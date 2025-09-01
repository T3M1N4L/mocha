/*global Ultraviolet*/
self.__uv$config = {
  prefix: '/uv/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: '/latte/uv.handler.js',
  client: '/latte/uv.client.js',
  bundle: '/latte/uv.bundle.js',
  config: '/latte/uv.config.js',
  sw: '/latte/uv.sw.js',
}
