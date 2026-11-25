import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LOCALES, localeDirection } from './locales';

describe('localeDirection', () => {
  it('keeps supported English locales left to right', () => {
    for (const locale of LOCALES) {
      assert.equal(localeDirection(locale), 'ltr');
    }
  });
});
