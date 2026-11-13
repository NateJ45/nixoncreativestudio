import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInquiryEmail, phoneHref, websiteHref } from './inquiry-email.ts';

const meta = {
  id: 12,
  receivedAt: new Date('2026-11-09T19:02:42Z'),
  country: 'US',
  siteUrl: 'https://nixoncreativestudio.com',
  studioName: 'Nixon Creative Studio',
};

const full = {
  name: 'Jane Smith',
  email: 'jane@gracechurch.org',
  message: 'We need a new site before Easter.\nOur current one is hard to update.',
  organization: 'Grace Church',
  phone: '(513) 555-0142',
  current_website: 'gracechurch.org',
  org_type: 'church',
  runs: 'team',
  budget: '4k-7k',
  timeline: '1-3-months',
  heard_from: 'referral',
  from: 'presbyterian-academy',
  tier: 'Signature',
};

describe('buildInquiryEmail', () => {
  it('puts who, type, budget and timing in the subject', () => {
    const { subject } = buildInquiryEmail(full, meta);
    assert.match(
      subject,
      /^New inquiry: Grace Church · Church · \$[\d,]+ to \$[\d,]+ · 1 to 3 months$/,
    );
  });

  it('drops unhelpful subject parts and falls back to the name', () => {
    const { subject } = buildInquiryEmail(
      { name: 'Jane', email: 'j@x.org', message: 'Hi', org_type: 'other', budget: 'not-sure' },
      meta,
    );
    assert.equal(subject, 'New inquiry: Jane');
  });

  it('shows the labels the visitor saw, not the stored keys', () => {
    const { html, text } = buildInquiryEmail(full, meta);
    for (const out of [html, text]) {
      assert.ok(out.includes('A few staff or volunteers'));
      assert.ok(out.includes('In the next 1 to 3 months'));
      assert.ok(out.includes('A referral from someone I know'));
      assert.ok(!out.includes('4k-7k'));
    }
  });

  it('offers one-tap reply, text, call and website actions', () => {
    const { html } = buildInquiryEmail(full, meta);
    assert.ok(html.includes('mailto:jane@gracechurch.org?subject='));
    assert.ok(html.includes('Reply to Jane'));
    assert.ok(html.includes('href="https://nixoncreativestudio.com/text/#5135550142"'));
    assert.ok(!html.includes('sms:'), 'Gmail strips sms: links');
    assert.ok(html.includes('href="tel:5135550142"'));
    assert.ok(html.includes('href="https://gracechurch.org/"'));
  });

  it('links the page they came from and names the row and time', () => {
    const { html, text } = buildInquiryEmail(full, meta);
    assert.ok(html.includes('https://nixoncreativestudio.com/work/presbyterian-academy/'));
    assert.ok(text.includes('Inquiry #12 · received Mon, Nov 9, 2:02 PM EST · from US'));
  });

  it('escapes everything a visitor typed', () => {
    const { html, subject } = buildInquiryEmail(
      {
        ...full,
        name: '<script>alert(1)</script>',
        organization: '"><img src=x>',
        message: '<b>hi</b>',
      },
      meta,
    );
    assert.doesNotMatch(html, /<script>|<img src=x>|<b>hi<\/b>/);
    assert.ok(html.includes('&lt;b&gt;hi&lt;/b&gt;'));
    assert.ok(subject.includes('"><img src=x>')); // a subject is plain text, not HTML
  });

  it('keeps line breaks in the message', () => {
    const { html } = buildInquiryEmail(full, meta);
    assert.ok(html.includes('before Easter.<br>Our current one'));
  });

  it('leaves out actions and rows for answers it does not have', () => {
    const { html } = buildInquiryEmail({ name: 'Jane', email: 'j@x.org', message: 'Hi' }, meta);
    assert.ok(!html.includes('/text/#'));
    assert.ok(!html.includes('At a glance'));
    assert.ok(!html.includes('Where they came from'));
  });

  it('says when the row was not stored', () => {
    const { text } = buildInquiryEmail(full, { ...meta, id: null });
    assert.ok(text.includes('Not stored (database error)'));
  });
});

describe('websiteHref', () => {
  it('adds https and refuses non-web schemes and bare words', () => {
    assert.equal(websiteHref('example.org/about'), 'https://example.org/about');
    assert.equal(websiteHref('http://example.org'), 'http://example.org/');
    assert.equal(websiteHref('javascript:alert(1)'), null);
    assert.equal(websiteHref('none'), null);
    assert.equal(websiteHref(''), null);
  });
});

describe('phoneHref', () => {
  it('keeps digits and a leading plus, and refuses non-numbers', () => {
    assert.equal(phoneHref('+1 (513) 555-0142'), '+15135550142');
    assert.equal(phoneHref('call me'), null);
  });
});

describe('buildInquiryEmail: spam check and where it came from', () => {
  const spam = {
    score: 4,
    verdict: 'flag' as const,
    reasons: ['Sent from outside the US (NL) (+2)', 'Sent from a server network (+2)'],
  };

  it('marks a flagged inquiry in the subject, the text and the html', () => {
    const e = buildInquiryEmail(full, { ...meta, spam });
    assert.match(e.subject, /^\[Likely spam\] New inquiry: Grace Church/);
    assert.match(e.text, /Spam check: 4 points\n- Sent from outside the US \(NL\) \(\+2\)/);
    assert.match(e.html, /Likely spam: 4 points\./);
  });

  it('says nothing about spam when the score is ok', () => {
    const e = buildInquiryEmail(full, {
      ...meta,
      spam: { score: 1, verdict: 'ok', reasons: ['x'] },
    });
    assert.doesNotMatch(e.subject, /Likely spam/);
    assert.doesNotMatch(e.html, /Likely spam/);
  });

  it('names the rough place and network in the footer', () => {
    const e = buildInquiryEmail(full, {
      ...meta,
      place: 'Cincinnati, Ohio',
      network: 'Charter Communications',
    });
    assert.match(e.text, /from Cincinnati, Ohio, US on Charter Communications/);
  });
});
