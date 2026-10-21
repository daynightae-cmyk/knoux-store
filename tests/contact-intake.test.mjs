/**
 * Request intake: the delivery contract.
 *
 * The confirmed production failure was a valid enquiry answered with 503
 * because no transport was configured. Failing closed is correct — a site that
 * cannot deliver must not answer "received" — but it has to be a *verified*
 * contract, not an accident: the endpoint must refuse with a clear refusal
 * when nothing can deliver, deliver when something can, and say so honestly
 * when the transport itself failed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { loadTypeScript } from './load.mjs';

const { POST } = await loadTypeScript('../src/app/api/contact/route.ts');

const VALID = {
  name: 'A Customer',
  email: 'customer@example.com',
  organisation: 'Example Ltd',
  message: 'A real enquiry that should reach a human being.',
  requestType: 'custom',
  selectedItems: ['A selected item'],
  preferredChannels: ['email'],
  budgetBand: null,
  timeline: 'now',
  sourceInput: null,
  entryRoute: '/contact',
};

function submit(body, headers = {}) {
  return POST(
    new Request('https://knoux.store/api/contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'sec-fetch-site': 'same-origin',
        origin: 'https://knoux.store',
        host: 'knoux.store',
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

test('a valid enquiry with no delivery transport is refused, and is not reported as delivered', async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_WEBHOOK_URL;

  const response = await submit(VALID);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.delivered, false);
  assert.match(body.error, /not configured/i);
  assert.equal(body.ok, undefined);
});

test('a configured webhook receives the enquiry and the endpoint reports it delivered', async () => {
  const received = [];
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      received.push(JSON.parse(body));
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"ok":true}');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const previous = process.env.CONTACT_WEBHOOK_URL;
  process.env.CONTACT_WEBHOOK_URL = `http://127.0.0.1:${port}/hook`;
  try {
    const response = await submit(VALID);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.delivered, true);
    assert.equal(body.ok, true);
    assert.equal(received.length, 1);
    assert.equal(received[0].email, 'customer@example.com');
    assert.equal(received[0].source, 'knoux.store');
    assert.ok(received[0].receivedAt);
  } finally {
    if (previous === undefined) delete process.env.CONTACT_WEBHOOK_URL;
    else process.env.CONTACT_WEBHOOK_URL = previous;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('a webhook that refuses the enquiry is reported as a delivery failure, not as a receipt', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(500);
    response.end('nope');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const previous = process.env.CONTACT_WEBHOOK_URL;
  process.env.CONTACT_WEBHOOK_URL = `http://127.0.0.1:${port}/hook`;
  try {
    const response = await submit(VALID);
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.delivered, false);
  } finally {
    if (previous === undefined) delete process.env.CONTACT_WEBHOOK_URL;
    else process.env.CONTACT_WEBHOOK_URL = previous;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('the intake still refuses a cross-site submission before it reads anything', async () => {
  const response = await submit(VALID, { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.delivered, false);
});

test('the intake still refuses an invalid submission', async () => {
  const response = await submit({ ...VALID, email: 'not-an-email' });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.delivered, false);
});
