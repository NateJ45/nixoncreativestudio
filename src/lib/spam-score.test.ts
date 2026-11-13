import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreInquiry, inquiryRuleErrors, FLAG_AT, HOLD_AT } from './spam-score.ts';

const base = { country: 'US', asOrg: 'Charter Communications', recentFromSameEmail: 0 };

describe('scoreInquiry: the real spam it was calibrated on', () => {
  it('holds the keyboard-mash inquiry (D1 row 6)', () => {
    const r = scoreInquiry({
      fields: {
        name: 'NAERTERHTE2537443NEHTYHYHTR',
        email: 'idris342302@notboxletters.com',
        message: 'MERTYHRTHYHT2537443MARTHHDF',
        organization: 'NAERTERHTE2537443NEHTYHYHTR',
        phone: '82996247182',
      },
      country: 'DE',
      asOrg: null,
      recentFromSameEmail: 1,
    });
    assert.equal(r.verdict, 'hold');
    assert.ok(r.score >= HOLD_AT);
    assert.ok(r.reasons.some((x) => x.startsWith('Throwaway email address')));
  });

  it('holds the price-question inquiry in Luxembourgish (D1 row 7)', () => {
    const r = scoreInquiry({
      fields: {
        name: 'RobertRoure',
        email: 'aveyekoha655@gmail.com',
        message: 'Salut, ech wollt Äre Präis wëssen.',
        organization: 'RobertRoure',
        phone: '88573789838',
      },
      country: 'LT',
      asOrg: null,
      recentFromSameEmail: 0,
    });
    assert.equal(r.verdict, 'hold', r.reasons.join(' | '));
  });
});

describe('scoreInquiry: real people pass', () => {
  it('scores a US church inquiry 0', () => {
    const r = scoreInquiry({
      ...base,
      fields: {
        name: 'Grace Miller',
        email: 'office@gracechurch.org',
        message:
          'We need a new website for our church before Advent. Our current one is hard to update.',
        organization: 'Grace Church',
        phone: '(513) 555-0142',
      },
    });
    assert.deepEqual(r, { score: 0, reasons: [], verdict: 'ok' });
  });

  it('lets a real overseas inquiry through un-flagged', () => {
    const r = scoreInquiry({
      ...base,
      country: 'CA',
      fields: {
        name: 'Jean Tremblay',
        email: 'jean@ecole.ca',
        message: 'Our school is looking for a simpler site that teachers can update.',
        phone: '+1 514 555 0100',
      },
    });
    assert.equal(r.verdict, 'ok');
  });

  it('does not count iCloud Private Relay networks as servers', () => {
    for (const asOrg of ['Akamai Technologies', 'Cloudflare, Inc.', 'Fastly']) {
      const r = scoreInquiry({
        ...base,
        asOrg,
        fields: { name: 'Ann Lee', message: 'Hello, we would like a new site.' },
      });
      assert.equal(r.score, 0, asOrg);
    }
  });

  it('flags, but still emails, a VPN user from abroad on a server network', () => {
    const r = scoreInquiry({
      ...base,
      country: 'NL',
      asOrg: 'DigitalOcean, LLC',
      fields: { name: 'Sam Price', message: 'Can you help our charity with a new website?' },
    });
    assert.equal(r.verdict, 'flag');
    assert.ok(r.score >= FLAG_AT && r.score < HOLD_AT);
  });
});

describe('scoreInquiry: single signals', () => {
  const one = (fields: Record<string, unknown>, extra = {}) =>
    scoreInquiry({
      ...base,
      ...extra,
      fields: { name: 'Ann Lee', message: 'We need a new website.', ...fields },
    });

  it('counts Tor more than an ordinary foreign country', () => {
    assert.equal(one({}, { country: 'T1' }).score, 3);
    assert.equal(one({}, { country: 'FR' }).score, 2);
    assert.equal(one({}, { country: 'XX' }).score, 0);
  });
  it('reads phone numbers', () => {
    assert.equal(one({ phone: '513-555-0142' }).score, 0);
    assert.equal(one({ phone: '1 513 555 0142' }).score, 0);
    assert.equal(one({ phone: '+44 20 7946 0958' }).score, 1);
    assert.equal(one({ phone: '' }).score, 0);
  });
  it('counts several links in the message', () => {
    assert.equal(
      one({ message: 'See https://a.example and https://b.example for our offer' }).score,
      2,
    );
  });
  it('counts a repeat sender once, whatever the count', () => {
    assert.equal(one({}, { recentFromSameEmail: 3 }).score, 1);
  });
});

describe('inquiryRuleErrors', () => {
  const types = ['church', 'school'];
  it('wants an org type the form offers', () => {
    assert.ok(inquiryRuleErrors({ message: 'x'.repeat(40) }, types).org_type);
    assert.ok(inquiryRuleErrors({ org_type: 'castle', message: 'x'.repeat(40) }, types).org_type);
    assert.deepEqual(inquiryRuleErrors({ org_type: 'church', message: 'x'.repeat(40) }, types), {});
  });
  it('wants 30 letters in the message, and leaves an empty one to the shared validator', () => {
    assert.ok(inquiryRuleErrors({ org_type: 'church', message: 'too short' }, types).message);
    assert.equal(inquiryRuleErrors({ org_type: 'church', message: '' }, types).message, undefined);
  });
});
