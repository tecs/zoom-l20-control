import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ccStatus, channelOf, dataLength, isStatus, typeOf } from './midi.ts';

describe('MIDI', () => {
  describe('isStatus()', () => {
    it('tells status bytes from data bytes', () => {
      assert.equal(isStatus(0x80), true);
      assert.equal(isStatus(0xf7), true);
      assert.equal(isStatus(0x7f), false);
      assert.equal(isStatus(0x00), false);
    });
  });

  describe('typeOf() and channelOf()', () => {
    it('split a status byte into its halves', () => {
      assert.equal(typeOf(0xb3), 0xb0);
      assert.equal(channelOf(0xb3), 3);
    });
  });

  describe('ccStatus()', () => {
    it('builds a Control Change status byte', () => {
      assert.equal(ccStatus(0), 0xb0);
      assert.equal(ccStatus(15), 0xbf);
    });
  });

  describe('dataLength()', () => {
    it('gives channel messages 1 or 2 data bytes', () => {
      assert.equal(dataLength(0x93), 2); // note on
      assert.equal(dataLength(0xb3), 2); // control change
      assert.equal(dataLength(0xc3), 1); // program change
      assert.equal(dataLength(0xd3), 1); // channel pressure
      assert.equal(dataLength(0xe3), 2); // pitch bend
    });

    it('gives the system messages that carry data their own lengths', () => {
      assert.equal(dataLength(0xf1), 1);
      assert.equal(dataLength(0xf2), 2);
      assert.equal(dataLength(0xf3), 1);
    });

    it('gives SysEx and every other system message none', () => {
      assert.equal(dataLength(0xf0), 0);
      assert.equal(dataLength(0xf6), 0);
      assert.equal(dataLength(0xf7), 0);
      assert.equal(dataLength(0xf8), 0);
      assert.equal(dataLength(0xff), 0);
    });
  });
});
