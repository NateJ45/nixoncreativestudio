import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventFor, linkDomain, track } from './track.ts';

type Call = [string, string, Record<string, unknown>];

function fakeWindow() {
  const calls: Call[] = [];
  return { calls, win: { gtag: (...args: Call) => calls.push(args) } };
}

test('track is a no-op when gtag is absent', () => {
  assert.doesNotThrow(() => track('generate_lead', { form: 'contact' }, {}));
  assert.doesNotThrow(() => track('generate_lead', {}, undefined));
  assert.doesNotThrow(() => track('generate_lead', {}, { gtag: 'not a function' }));
});

test('track sends an event through gtag', () => {
  const { calls, win } = fakeWindow();
  track('generate_lead', { form: 'contact' }, win);
  assert.deepEqual(calls, [['event', 'generate_lead', { form: 'contact' }]]);
});

test('track drops any param that is not a short label (no free text, no email)', () => {
  const { calls, win } = fakeWindow();
  track(
    'contact_click',
    { method: 'mailto', email: 'someone@example.com', note: 'hello there', count: 2 },
    win,
  );
  assert.deepEqual(calls[0][2], { method: 'mailto', count: 2 });
});

test('track never throws when gtag does', () => {
  const win = {
    gtag: () => {
      throw new Error('boom');
    },
  };
  assert.doesNotThrow(() => track('pricing_view', {}, win));
});

test('linkDomain keeps the hostname only, without www', () => {
  assert.equal(linkDomain('https://www.fbcmuncie.org/about/?x=1'), 'fbcmuncie.org');
  assert.equal(linkDomain('https://stonesteps50k.com'), 'stonesteps50k.com');
  assert.equal(linkDomain('mailto:hello@example.com'), '');
  assert.equal(linkDomain('/contact/'), '');
});

test('eventFor maps each data-cta to its event', () => {
  assert.deepEqual(
    eventFor({ cta: 'visit_client_site', href: 'https://www.fbcmuncie.org', location: 'title' }),
    {
      name: 'visit_client_site',
      params: { cta_location: 'title', link_domain: 'fbcmuncie.org' },
    },
  );
  assert.deepEqual(
    eventFor({ cta: 'book_call_click', href: 'https://cal.com/x', location: 'main' }),
    {
      name: 'book_call_click',
      params: { cta_location: 'main' },
    },
  );
  assert.deepEqual(eventFor({ cta: 'contact_click', method: 'copy', location: 'footer' }), {
    name: 'contact_click',
    params: { cta_location: 'footer', method: 'copy' },
  });
  assert.deepEqual(eventFor({ cta: 'size_up_send', location: 'main' }), {
    name: 'cta_click',
    params: { cta_location: 'main', cta_id: 'size_up_send' },
  });
});

test('eventFor picks up a bare mailto link and never sends the address', () => {
  const result = eventFor({ href: 'mailto:hello@example.com?subject=Hi', location: 'menu' });
  assert.deepEqual(result, {
    name: 'contact_click',
    params: { cta_location: 'menu', method: 'mailto' },
  });
  assert.ok(!JSON.stringify(result).includes('@'));
});

test('eventFor ignores an ordinary link', () => {
  assert.equal(eventFor({ href: '/work/', location: 'header' }), null);
});
