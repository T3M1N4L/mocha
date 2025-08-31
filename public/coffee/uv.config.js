/*global Ultraviolet*/
self.__uv$config = {
  prefix: '/~/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: '/coffee/uv.handler.js',
  client: '/coffee/uv.client.js',
  bundle: '/coffee/uv.bundle.js',
  config: '/coffee/uv.config.js',
  sw: '/coffee/uv.sw.js',
      inject: async (url) => {
        if (url.host === 'discord.com') {
            return `
                <script src="https://raw.githubusercontent.com/Vencord/builds/main/browser.js"></script>
                <link rel="stylesheet" href="https://raw.githubusercontent.com/Vencord/builds/main/browser.css">
              `;
        }

        return ``;
    },
}
