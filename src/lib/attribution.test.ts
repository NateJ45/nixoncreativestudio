import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadSource, readTouch } from './attribution.ts';

const HOST = 'nixoncreativestudio.com';

test('readTouch keeps only the referrer hostname and the landing path', () => {
  const t = readTouch(
    'https://nixoncreativestudio.com/churches/?utm_source=Instagram&utm_medium=bio&x=1',
    'https://www.google.com/search?q=church+website+design',
    HOST,
    5,
  );
  assert.deepEqual(t, {
    landing: '/churches/',
    referrer: 'google.com',
    utm_source: 'instagram',
    utm_medium: 'bio',
    utm_campaign: '',
    at: 5,
  });
});

test('readTouch ignores the site itself as a referrer, and junk tags', () => {
  const t = readTouch(
    'https://nixoncreativestudio.com/?utm_source=a%20b%40c.com',
    'https://www.nixoncreativestudio.com/work/',
    HOST,
    1,
  );
  assert.equal(t.referrer, '');
  assert.equal(t.utm_source, '');
});

test('leadSource labels each kind of first touch', () => {
  const base = { landing: '/', utm_medium: '', utm_campaign: '', at: 0 };
  assert.equal(leadSource(null), 'unknown');
  assert.equal(leadSource({ ...base, referrer: '', utm_source: '' }), 'direct');
  assert.equal(
    leadSource({ ...base, referrer: 'google.com', utm_source: 'newsletter' }),
    'newsletter',
  );
  assert.equal(leadSource({ ...base, referrer: 'google.co.uk', utm_source: '' }), 'search-google');
  assert.equal(leadSource({ ...base, referrer: 'bing.com', utm_source: '' }), 'search-bing');
  assert.equal(leadSource({ ...base, referrer: 'chatgpt.com', utm_source: '' }), 'ai-chatgpt.com');
  assert.equal(
    leadSource({ ...base, referrer: 'perplexity.ai', utm_source: '' }),
    'ai-perplexity.ai',
  );
  assert.equal(
    leadSource({ ...base, referrer: 'l.instagram.com', utm_source: '' }),
    'social-instagram',
  );
  assert.equal(
    leadSource({ ...base, referrer: 'crestviewchurch.org', utm_source: '' }),
    'referral-crestviewchurch.org',
  );
});
