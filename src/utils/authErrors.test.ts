// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../i18n/config';
import { getAuthErrorMessage, normalizeSupabaseError } from './authErrors';

// p12 health-status-17 / WP-P0-15: with leaked-password protection on, Auth
// refuses a breached password with 422 weak_password, reasons ['pwned'].
const PWNED_MESSAGE = 'Password is known to be weak and easy to guess, please choose a different one.';
const pwnedError = () =>
  Object.assign(new Error(PWNED_MESSAGE), {
    name: 'AuthWeakPasswordError',
    code: 'weak_password',
    status: 422,
    reasons: ['pwned'],
  });

describe('normalizeSupabaseError — weak and leaked passwords', () => {
  it('maps the AuthWeakPasswordError with reason pwned to PWNED_PASSWORD', () => {
    const n = normalizeSupabaseError(pwnedError());
    expect(n.code).toBe('PWNED_PASSWORD');
    expect(n.status).toBe(422);
    expect(n.isRetryable).toBe(true);
  });

  it('maps the bare message string to PWNED_PASSWORD', () => {
    expect(normalizeSupabaseError(PWNED_MESSAGE).code).toBe('PWNED_PASSWORD');
  });

  it('maps a plain object with reasons pwned to PWNED_PASSWORD', () => {
    expect(
      normalizeSupabaseError({ code: 'weak_password', status: 422, reasons: ['pwned'], message: 'x' }).code,
    ).toBe('PWNED_PASSWORD');
  });

  it('maps any other weak_password refusal to WEAK_PASSWORD', () => {
    const n = normalizeSupabaseError(
      Object.assign(new Error('Password should be at least 6 characters.'), {
        code: 'weak_password',
        reasons: ['length'],
      }),
    );
    expect(n.code).toBe('WEAK_PASSWORD');
  });

  it('leaves the existing mappings unchanged', () => {
    expect(normalizeSupabaseError('Invalid login credentials').code).toBe('INVALID_CREDENTIALS');
    expect(normalizeSupabaseError('Email not confirmed').code).toBe('EMAIL_NOT_CONFIRMED');
    expect(normalizeSupabaseError('New password should be different from the old password.').code).toBe(
      'SAME_PASSWORD',
    );
    expect(normalizeSupabaseError(new Error('Invalid login credentials')).code).toBe('INVALID_CREDENTIALS');
  });
});

describe('getAuthErrorMessage — PWNED_PASSWORD in the member language', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('reads the breach message in English and Japanese', async () => {
    await i18n.changeLanguage('en');
    expect(getAuthErrorMessage(pwnedError())).toBe(
      'This password has shown up in a data breach elsewhere. Choose a different one.',
    );
    await i18n.changeLanguage('ja');
    expect(getAuthErrorMessage(pwnedError())).toBe(
      'このパスワードは他のサービスの情報流出で見つかっています。別のパスワードにしてください。',
    );
  });

  it('reads the breach message in Korean and Chinese', async () => {
    await i18n.changeLanguage('ko');
    expect(getAuthErrorMessage(pwnedError())).toBe(
      '이 비밀번호는 다른 곳의 정보 유출에서 발견됐어요. 다른 비밀번호로 정해 주세요.',
    );
    await i18n.changeLanguage('zh');
    expect(getAuthErrorMessage(pwnedError())).toBe('此密码曾在其他网站的数据泄露中出现，请换一个密码。');
  });
});
