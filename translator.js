/**
 * Where the translator should look for your data. If you visit this page you
 * should see the main things list of the Gateway. If running locally, this may
 * be https://gateway.local, http://gateway.local, https://localhost:4443, or
 * http://localhost:8080 instead.
 */
const yourGatewayUrl = 'https://your-domain-here.mozilla-iot.org';

/**
 * A JSON Web Token used by the translator to authenticate with the gateway.
 * Can be issued using the gateway's local token service, accessible from the
 * Authorizations section of the Settings page.
 */
const yourJwt = 'text.text.and more text';

const express = require('express');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const server = express();
const {register, Gauge} = require('prom-client');

const gatewayUrl = process.argv[2] || yourGatewayUrl;
const jwt = process.argv[3] || yourJwt;

const headers = {
  Accept: 'application/json',
  Authorization: `Bearer ${jwt}`
};

const metrics = {};

function safeMetricId(thingId, propId) {
  if (!thingId.match(/^[a-zA-Z_:]/)) {
    thingId = '_' + thingId;
  }
  return (thingId + '_' + propId).replace(/[^a-zA-Z0-9_:]/g, '_');
}

function addListeners(ws, thingId) {
  ws.addEventListener('message', function(event) {
    console.log(event.data);
    let msg = JSON.parse(event.data);
    if (msg.messageType === 'propertyStatus') {
      for (let propId in msg.data) {
        let metricId = safeMetricId(thingId, propId);
        let value = msg.data[propId];
        if (typeof(value) === 'boolean') {
          value = value ? 1 : 0;
        }
        metrics[metricId].set(value);
      }
    }
  });

  function reopen() {
    let newWs = new WebSocket(ws.url);
    addListeners(newWs, thingId);
  }

  ws.addEventListener('close', function() {
    console.log('reopening in the close');
    reopen();
  });

  ws.addEventListener('error', function() {
    console.log('reopening in the error');
    reopen();
  });
}

fetch(`${gatewayUrl}/things`, {
  headers: headers
}).then(res => {
  return res.json();
}).then(things => {
  for (let thing of things) {
    let wsUrl = gatewayUrl.replace('http', 'ws');
    let ws = new WebSocket(`${wsUrl}${thing.href}?jwt=${jwt}`);
    let thingId = thing.href.split('/')[2];

    addListeners(ws, thingId);

    for (let propId in thing.properties) {
      let prop = thing.properties[propId];
      if (prop.type !== 'boolean' && prop.type !== 'number') {
        continue;
      }

      let metricId = safeMetricId(thingId, propId);
      metrics[metricId] = new Gauge({
        name: metricId,
        help: thing.name + ' property ' + propId
      });

      fetch(`${gatewayUrl}${prop.href}`, {
        headers: headers
      }).then(res => {
        return res.json();
      }).then(res => {
        let value = res[propId];
        if (typeof(value) === 'boolean') {
          value = value ? 1 : 0;
        }
        metrics[metricId].set(value);
      }).catch(err => {
        console.warn('initial fetch failed', err);
      });
    }
  }
});


server.get('/metrics', (req, res) => {
	res.set('Content-Type', register.contentType);
	res.end(register.metrics());
});

console.log('Translator listening to 3060, metrics exposed on /metrics endpoint');
server.listen(3060);
