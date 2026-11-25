import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localeFromAcceptLanguage } from './accept-language';

describe('localeFromAcceptLanguage', () => {
  it('matches English and regional English browser locales', () => {
    assert.equal(localeFromAcceptLanguage('en-US,en;q=0.9'), 'en');
    assert.equal(localeFromAcceptLanguage('fr;q=0.9,en-GB;q=0.8'), 'en');
  });

  it('uses the fallback for a preferred wildcard', () => {
    assert.equal(localeFromAcceptLanguage('de-DE,*;q=0.9'), 'en');
  });

  it('falls back to English when no requested language is supported', () => {
    assert.equal(localeFromAcceptLanguage('de-DE,ja;q=0.9'), 'en');
    assert.equal(localeFromAcceptLanguage(null), 'en');
  });
});
