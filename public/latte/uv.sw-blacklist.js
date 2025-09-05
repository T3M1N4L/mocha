importScripts('{{route}}{{/latte/uv.bundle.js}}');
importScripts('{{route}}{{/latte/uv.config.js}}');
importScripts(self['{{__uv$config}}'].sw || '{{route}}{{/latte/uv.sw.js}}');

const uv = new UVServiceWorker();

const blacklist = {};
fetch('{{route}}{{/public/blocklist/blacklist.json}}').then((request) => {
  request.json().then((jsonData) => {
    jsonData.forEach((domain) => {
      const domainTld = domain.replace(/.+(?=\.\w)/, '');
      if (!blacklist.hasOwnProperty(domainTld)) blacklist[domainTld] = [];
      blacklist[domainTld].push(
        encodeURIComponent(domain.slice(0, -domainTld.length))
          .replace(/([()])/g, '\\$1')
          .replace(/(\*\.)|\./g, (match, firstExpression) =>
            firstExpression ? '(?:.+\\.)?' : '\\' + match
          )
      );
    });

    for (let [domainTld, domainList] of Object.entries(blacklist))
      blacklist[domainTld] = new RegExp(`^(?:${domainList.join('|')})$`);
    Object.freeze(blacklist);
  });
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      if (uv.route(event)) {
        const domain = new URL(
            uv.config.decodeUrl(
              new URL(event.request.url).pathname.replace(uv.config.prefix, '')
            )
          ).hostname,
          domainTld = domain.replace(/.+(?=\.\w)/, '');
        if (
          blacklist.hasOwnProperty(domainTld) &&
          blacklist[domainTld].test(domain.slice(0, -domainTld.length))
        )
          return new Response(new Blob(), { status: 406 });

        return await uv.fetch(event);
      }
      return await fetch(event.request);
    })()
  );
});