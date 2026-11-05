import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adapterNotFoundHint, bluetoothUnavailableHint, writeErrorHint, type Platform } from './hints.ts';

const chromeOnMac: Platform = { secureContext: true, ios: false, linux: false, chromium: true, brave: false };

describe('bluetoothUnavailableHint()', () => {
  it('asks for a secure origin first, whatever the browser', () => {
    assert.match(bluetoothUnavailableHint({ ...chromeOnMac, secureContext: false, ios: true }), /https:\/\//);
  });

  it('points iOS users to Bluefy', () => {
    assert.match(bluetoothUnavailableHint({ ...chromeOnMac, ios: true }), /Bluefy/);
  });

  it('asks for a Chromium browser elsewhere', () => {
    assert.match(bluetoothUnavailableHint({ ...chromeOnMac, chromium: false }), /Chrome, Edge or Brave/);
  });

  it('names the flags Brave needs, plus the Linux one on Linux', () => {
    const brave = bluetoothUnavailableHint({ ...chromeOnMac, brave: true });
    assert.match(brave, /brave-web-bluetooth-api/);
    assert.doesNotMatch(brave, /experimental-web-platform-features/);
    assert.match(
      bluetoothUnavailableHint({ ...chromeOnMac, brave: true, linux: true }),
      /brave-web-bluetooth-api.*experimental-web-platform-features/,
    );
  });

  it('names the experimental flag on Linux', () => {
    assert.match(bluetoothUnavailableHint({ ...chromeOnMac, linux: true }), /experimental-web-platform-features/);
  });

  it('always starts with what is wrong', () => {
    assert.match(bluetoothUnavailableHint(chromeOnMac), /^Web Bluetooth unavailable\. /);
  });
});

describe('adapterNotFoundHint()', () => {
  it('names BlueZ and rfkill on Linux', () => {
    assert.match(adapterNotFoundHint({ ...chromeOnMac, linux: true }), /systemctl enable --now bluetooth.*rfkill/);
  });

  it('mentions the per-app Bluetooth permission on iOS', () => {
    assert.match(adapterNotFoundHint({ ...chromeOnMac, ios: true }), /Privacy & Security > Bluetooth/);
  });

  it('asks to turn Bluetooth on elsewhere', () => {
    assert.match(adapterNotFoundHint(chromeOnMac), /Turn Bluetooth on/);
  });
});

describe('writeErrorHint()', () => {
  it('names the BlueZ midi plugin on Linux only', () => {
    assert.match(writeErrorHint({ ...chromeOnMac, linux: true }) ?? '', /-P midi/);
    assert.equal(writeErrorHint(chromeOnMac), null);
  });
});
