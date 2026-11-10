import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { smsFromHash, textHandoffUrl } from './text-handoff.ts';

describe('text handoff', () => {
  it('builds an https link with the number in the fragment', () => {
    assert.equal(
      textHandoffUrl('https://nixoncreativestudio.com', '5135550142'),
      'https://nixoncreativestudio.com/text/#5135550142',
    );
    assert.equal(
      textHandoffUrl('https://nixoncreativestudio.com/', '+15135550142'),
      'https://nixoncreativestudio.com/text/#%2B15135550142',
    );
  });

  it('turns the fragment back into an sms: target', () => {
    assert.equal(smsFromHash('#5135550142'), 'sms:5135550142');
    assert.equal(smsFromHash('#%2B15135550142'), 'sms:+15135550142');
    assert.equal(smsFromHash('#+15135550142'), 'sms:+15135550142');
  });

  it('refuses anything that is not a phone number', () => {
    for (const h of ['', '#', '#123', '#javascript:alert(1)', '#5135550142?body=hi', '#%E0%A4%A']) {
      assert.equal(smsFromHash(h), null, h);
    }
  });
});
