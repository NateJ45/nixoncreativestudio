import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inquiryToSubmission } from './inquiry.ts';
import { validateSubmission, looksAutomated } from './contact-submission.ts';

const base = {
  name: 'Test Person',
  email: 'test@example.com',
  message: 'A new website for the congregation.',
  org_type: 'church',
};

describe('inquiryToSubmission', () => {
  it('folds the optional answers into the message, in form order, skipping empties', () => {
    const raw = inquiryToSubmission({
      ...base,
      budget: '4k-7k',
      phone: '',
      timeline: '1-3-months',
      organization: 'First Church',
    });
    assert.equal(
      raw.message,
      'A new website for the congregation.\n\n' +
        'Organization type: church\nBudget: 4k-7k\nOrganization: First Church\nTimeline: 1-3-months',
    );
    assert.equal(raw.subject, 'New project inquiry from First Church');
  });

  it('names the person in the subject when there is no organization', () => {
    assert.equal(inquiryToSubmission(base).subject, 'New project inquiry from Test Person');
  });

  it('still fails validation when the message is empty, whatever the details say', () => {
    const result = validateSubmission(inquiryToSubmission({ ...base, message: '  ' }));
    assert.equal(result.ok, false);
    assert.ok(result.errors.message);
  });

  it('passes a full answer through validation', () => {
    const result = validateSubmission(inquiryToSubmission(base));
    assert.equal(result.ok, true);
    assert.equal(result.value?.email, 'test@example.com');
  });

  it('hands the botcheck honeypot to the shared spam check', () => {
    const raw = inquiryToSubmission({ ...base, botcheck: 'filled by a bot' });
    assert.equal(looksAutomated(raw, Date.now()).automated, true);
  });

  it('passes rendered_at on for the timing check', () => {
    const now = Date.now();
    const raw = inquiryToSubmission({ ...base, rendered_at: String(now - 1000) });
    assert.equal(looksAutomated(raw, now).reason, 'too-fast');
  });

  it('caps a long detail so a hostile payload cannot pad the row', () => {
    const raw = inquiryToSubmission({ ...base, organization: 'x'.repeat(1000) });
    assert.ok(String(raw.message).length < 700);
  });
});
