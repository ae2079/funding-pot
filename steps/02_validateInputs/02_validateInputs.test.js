import '../../env.js';

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { validateInputs } from './02_validateInputs.js';

describe('#validateInputs', () => {
  const projectConfig = {
    SAFE: '0x4ffe42c1666e50104e997DD07E43c673FD39C81d',
    ORCHESTRATOR: '0x4ffe42c1666e50104e997DD07E43c673FD39C81d',
  };
  const batchConfig = {
    VESTING_DETAILS: {
      START: 1,
      CLIFF: 2,
      END: 10,
    },
  };
  const allowlist = ['0x327f6bc1b86eca753bfd2f8187d22b6aef7783eb'];
  const reports = {
    1: {},
    2: {},
  };

  describe('with first batch', () => {
    const batchNr = 1;

    describe('without reports', () => {
      it('does not throw', () => {
        assert.doesNotThrow(() => {
          validateInputs({
            projectConfig,
            batchConfig,
            allowlist,
            batchNr,
          });
        });
      });
    });
  });

  describe('with third batch', () => {
    const batchNr = 3;

    describe('without reports', () => {
      it('does not throw', () => {
        assert.throws(() => {
          validateInputs({
            projectConfig,
            batchConfig,
            allowlist,
            reports,
            batchNr,
          });
        });
      });
    });
  });

  describe('with empty configs', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig: {},
          batchConfig: {},
          allowlist: [],
        });
      });
    });
  });

  describe('without SAFE', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig: {
            ...projectConfig,
            SAFE: undefined,
          },
          batchConfig,
          allowlist,
        });
      });
    });
  });

  // write test of all combinattions
  describe('without ORCHESTRATOR', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig: {
            ...projectConfig,
            ORCHESTRATOR: undefined,
          },
          batchConfig,
          allowlist,
        });
      });
    });
  });

  describe('without START', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig,
          batchConfig: {
            ...batchConfig,
            VESTING_DETAILS: {
              ...batchConfig.VESTING_DETAILS,
              START: undefined,
            },
          },
          allowlist,
        });
      });
    });
  });

  describe('without CLIFF', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig,
          batchConfig: {
            ...batchConfig,
            VESTING_DETAILS: {
              ...batchConfig.VESTING_DETAILS,
              CLIFF: undefined,
            },
          },
          allowlist,
        });
      });
    });
  });

  describe('without END', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig,
          batchConfig: {
            ...batchConfig,
            VESTING_DETAILS: {
              ...batchConfig.VESTING_DETAILS,
              END: undefined,
            },
          },
          allowlist,
        });
      });
    });
  });

  describe('with START > END', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig,
          batchConfig: {
            ...batchConfig,
            VESTING_DETAILS: {
              ...batchConfig.VESTING_DETAILS,
              START: 10,
              END: 1,
            },
          },
          allowlist,
        });
      });
    });
  });

  describe('with START + CLIFF > END', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig,
          batchConfig: {
            ...batchConfig,
            VESTING_DETAILS: {
              ...batchConfig.VESTING_DETAILS,
              START: 10,
              CLIFF: 1,
              END: 1,
            },
          },
          allowlist,
        });
      });
    });
  });

  describe('with empty allowlist', () => {
    it('throws an error', () => {
      assert.throws(() => {
        validateInputs({
          projectConfig,
          batchConfig,
          allowlist: [],
        });
      });
    });
  });
});
