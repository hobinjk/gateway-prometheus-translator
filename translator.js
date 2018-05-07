const express = require('express');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const server = express();
const {register, Gauge} = require('prom-client');

const gatewayUrl = process.argv[2] || 'https://your-domain-here.mozilla-iot.org';
const jwt = process.argv[3] || 'text.text.and more text';
const headers = {
  Accept: 'application/json',
  Authorization: `Bearer ${jwt}`
};

const metrics = {};

function safeMetricId(thingId, propId) {
  return (thingId + '_' + propId).replace(/[-.]/g, '_');
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
  }
});


server.get('/metrics', (req, res) => {
	res.set('Content-Type', register.contentType);
	res.end(register.metrics());
});

console.log('Translator listening to 3030, metrics exposed on /metrics endpoint');
server.listen(3030);
