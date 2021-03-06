'use strict';
const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');
const { readSync } = require('../common/fixtures');
const net = require('net');
const http2 = require('http2');
const { once } = require('events');

async function main() {
  const blobWithEmptyFrame = readSync('emptyframe.http2');
  const server = net.createServer((socket) => {
    socket.end(blobWithEmptyFrame);
  }).listen(0);
  await once(server, 'listening');

  for (const maxSessionInvalidFrames of [0, 2]) {
    const client = http2.connect(`http://localhost:${server.address().port}`, {
      maxSessionInvalidFrames
    });
    const stream = client.request({
      ':method': 'GET',
      ':path': '/'
    });
    if (maxSessionInvalidFrames) {
      stream.on('error', common.mustNotCall());
      client.on('error', common.mustNotCall());
    } else {
      stream.on('error', common.mustCall());
      client.on('error', common.mustCall());
    }
    stream.resume();
    await once(stream, 'end');
    client.close();
  }
  server.close();
}

main().then(common.mustCall());
