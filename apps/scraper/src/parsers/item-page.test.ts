import { describe, expect, it } from 'vitest';
import { parseItemIconUrl } from './item-page';

describe('parseItemIconUrl', () => {
  it('should extract icon URL from og:image meta tag', () => {
    const html = `
      <html>
      <head>
        <meta property="og:image" content="https://lds-img.finalfantasyxiv.com/itemicon/0b/0b3c72afd5236a58c07115181af2ff004ca4fba6.png?n7.41">
      </head>
      <body></body>
      </html>
    `;
    expect(parseItemIconUrl(html)).toBe(
      'https://lds-img.finalfantasyxiv.com/itemicon/0b/0b3c72afd5236a58c07115181af2ff004ca4fba6.png?n7.41',
    );
  });

  it('should return null when og:image meta tag is missing', () => {
    const html = `
      <html>
      <head>
        <meta property="og:title" content="Some item">
      </head>
      <body></body>
      </html>
    `;
    expect(parseItemIconUrl(html)).toBeNull();
  });

  it('should return null when og:image has no content attribute', () => {
    const html = `
      <html>
      <head>
        <meta property="og:image">
      </head>
      <body></body>
      </html>
    `;
    expect(parseItemIconUrl(html)).toBeNull();
  });

  it('should return null for empty HTML', () => {
    expect(parseItemIconUrl('')).toBeNull();
  });

  it('should handle HTML with multiple meta tags', () => {
    const html = `
      <html>
      <head>
        <meta property="og:title" content="ガーロンド・キャスターコート">
        <meta property="og:description" content="Some description">
        <meta property="og:image" content="https://lds-img.finalfantasyxiv.com/itemicon/ab/abcdef1234567890.png?n7.41">
        <meta property="og:url" content="https://jp.finalfantasyxiv.com/lodestone/playguide/db/item/xxx/">
      </head>
      <body></body>
      </html>
    `;
    expect(parseItemIconUrl(html)).toBe(
      'https://lds-img.finalfantasyxiv.com/itemicon/ab/abcdef1234567890.png?n7.41',
    );
  });

  it('should handle icon URL without version query parameter', () => {
    const html = `
      <html>
      <head>
        <meta property="og:image" content="https://lds-img.finalfantasyxiv.com/itemicon/0b/0b3c72afd5236a58c07115181af2ff004ca4fba6.png">
      </head>
      <body></body>
      </html>
    `;
    expect(parseItemIconUrl(html)).toBe(
      'https://lds-img.finalfantasyxiv.com/itemicon/0b/0b3c72afd5236a58c07115181af2ff004ca4fba6.png',
    );
  });
});
