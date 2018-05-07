# gateway-prometheus-translator

Translates the Web Thing API into a set of Prometheus metrics.

## Installing on Raspberry Pi
```shell
cd ~/mozilla-iot
git clone https://github.com/hobinjk/gateway-prometheus-translator/
cd gateway-prometheus-translator
npm install
```

## Issuing a Local Token

To get the required information for the Translator to talk to the gateway you
need the url of your gateway and a local token. The local token is a JSON Web
Token (JWT) that the Translator presents to the gateway as authentication.

Visit the Authorizations section of the Settings page and click Create New
Local Authorization, following the steps until you're presented with a large
string of period-delimited base64 text. This is the local token.

## Running the Translator
```shell
node translator.js "https://your-gateway-url.mozilla-iot.org" "paste the token here"
```

If everything's working, you should be able to visit
`https://gateway.local:3060` (or `https://localhost:3060`) and see a wall of
text with the metric numbers.

## Troubleshooting
```
FetchError: request to https://your-domain-here.mozilla-iot.org/things failed, reason: getaddrinfo ENOTFOUND your-domain-here.mozilla-iot.org your-domain-here.mozilla-iot.org:443
```
This means you provided the wrong URL. If you haven't set up a domain locally,
the URL may be `https://gateway.local`, `https://localhost:4443`,
`http://gateway.local`, or `http://localhost:8080`.

```
(node:11828) UnhandledPromiseRejectionWarning: FetchError: invalid json response body at https://hobinjk.mozilla-iot.org/things reason: Unexpected end of JSON input
    at /Users/jhobin/moziot/gateway-prometheus-translator/node_modules/node-fetch/lib/index.js:254:32
    at <anonymous>
    at process._tickCallback (internal/process/next_tick.js:182:7)
```
This means the JWT you provided is invalid and the gateway is refusing to
acknowledge it. Try the create new local token process again and make sure
you're pasting the entire giant string.
