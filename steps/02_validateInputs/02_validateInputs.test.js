import '../../env.js';

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { validateInputs } from './02_validateInputs.js';

describe('#validateInputs', () => {
  const projectConfig = {
    SAFE: '0x4ffe42c1666e50104e997DD07E43c673FD39C81d',
    ORCHESTRATOR: '0x4ffe42c1666e50104e997DD07E43c673FD39C81d',
    NFT: '0xa47f284a5be76c10b902446acb1aea9550f4c71d',
  };

  const batchConfig = {
    VESTING_DETAILS: {
      START: 1,
      CLIFF: 2,
      END: 10,
    },
    LIMITS: {
      TOTAL: '500000',
      TOTAL_2: '50000',
      INDIVIDUAL: '5000',
      INDIVIDUAL_2: '500',
    },
    IS_EARLY_ACCESS: false,
    PRICE: '0.1',
  };
  const batchReports = {
    1: {},
    2: {},
  };

  const batchNr = 1;

  describe('with batchNr = 1', () => {
    describe('without batchReports', () => {
      it('does not throw', () => {
        assert.doesNotThrow(() => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig,
            batchNr,
          });
        });
      });
    });
  });

  describe('with batchNr = 3', () => {
    const thirdBatch = 3;

    describe('when there are less batchReports than the batchNr suggests', () => {
      it('throws', () => {
        assert.throws(
          () => {
            validateInputs({
              projectsConfig: { exampleProject: projectConfig },
              projectName: 'exampleProject',
              batchConfig,
              batchNr: thirdBatch,
              batchReports: { 1: {} },
            });
          },
          {
            name: 'Error',
            message:
              'Current batch nr is 3, but there are only 1 previous batchReports',
          }
        );
      });
    });

    describe('when there is a gap between report numbers', () => {
      it('throws', () => {
        assert.throws(
          () => {
            validateInputs({
              projectsConfig: { exampleProject: projectConfig },
              projectName: 'exampleProject',
              batchConfig,
              batchNr: thirdBatch,
              batchReports: { 1: {}, 3: {} },
            });
          },
          {
            name: 'Error',
            message: 'Report missing for batchNr 2',
          }
        );
      });
    });

    describe('with batchReports', () => {
      it('does not throw', () => {
        assert.doesNotThrow(() => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig,
            batchNr: thirdBatch,
            batchReports,
          });
        });
      });
    });
  });

  describe('with empty configs', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: {} },
            projectName: 'exampleProject',
            batchConfig: {},
            batchReports: {},
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: SAFE missing or invalid address',
        }
      );
    });
  });

  describe('without SAFE', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: {
              exampleProject: { ...projectConfig, SAFE: undefined },
            },
            projectName: 'exampleProject',
            batchConfig,
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: SAFE missing or invalid address',
        }
      );
    });
  });

  // write test of all combinattions
  describe('without ORCHESTRATOR', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: {
              exampleProject: {
                ...projectConfig,
                ORCHESTRATOR: undefined,
              },
            },
            projectName: 'exampleProject',
            batchConfig,
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: ORCHESTRATOR missing or invalid address',
        }
      );
    });
  });

  describe('without START', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: {
              ...batchConfig,
              VESTING_DETAILS: {
                ...batchConfig.VESTING_DETAILS,
                START: undefined,
              },
            },
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: VESTING_DETAILS missing or empty',
        }
      );
    });
  });

  describe('without CLIFF', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: {
              ...batchConfig,
              VESTING_DETAILS: {
                ...batchConfig.VESTING_DETAILS,
                CLIFF: undefined,
              },
            },
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: VESTING_DETAILS missing or empty',
        }
      );
    });
  });

  describe('without END', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: {
              ...batchConfig,
              VESTING_DETAILS: {
                ...batchConfig.VESTING_DETAILS,
                END: undefined,
              },
            },
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: VESTING_DETAILS missing or empty',
        }
      );
    });
  });

  describe('with START > END', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: {
              ...batchConfig,
              VESTING_DETAILS: {
                ...batchConfig.VESTING_DETAILS,
                START: 10,
                END: 1,
              },
            },
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: Vesting: START > END',
        }
      );
    });
  });

  describe('with START + CLIFF > END', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: {
              ...batchConfig,
              VESTING_DETAILS: {
                ...batchConfig.VESTING_DETAILS,
                START: 1,
                CLIFF: 3,
                END: 2,
              },
            },
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: Vesting: START + CLIFF > END',
        }
      );
    });
  });

  describe('without LIMITS', () => {
    const configWithoutLimits = { ...batchConfig };
    delete configWithoutLimits.LIMITS;

    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: configWithoutLimits,
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: LIMITS missing or empty',
        }
      );
    });
  });

  describe('without IS_EARLY_ACCESS flag', () => {
    const configWithoutFlag = { ...batchConfig };
    delete configWithoutFlag.IS_EARLY_ACCESS;

    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: configWithoutFlag,
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: IS_EARLY_ACCESS missing or empty',
        }
      );
    });
  });

  describe('without PRICE', () => {
    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: { exampleProject: projectConfig },
            projectName: 'exampleProject',
            batchConfig: { ...batchConfig, PRICE: undefined },
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: PRICE missing or empty',
        }
      );
    });
  });

  describe('without NFT', () => {
    const projectConfigWithoutNft = { ...projectConfig };
    delete projectConfigWithoutNft.NFT;

    it('throws an error', () => {
      assert.throws(
        () => {
          validateInputs({
            projectsConfig: {
              exampleProject: {
                ...projectConfig,
                NFT: undefined,
              },
            },
            projectName: 'exampleProject',
            batchConfig,
            batchReports,
          });
        },
        {
          name: 'Error',
          message:
            'Error in project exampleProject: NFT missing or invalid address',
        }
      );
    });
  });

  describe("with EARLY_ACCESS = 'true'", () => {
    describe('without TOTAL_2', () => {
      it('throws an error', () => {
        assert.throws(
          () => {
            validateInputs({
              projectsConfig: { exampleProject: projectConfig },
              projectName: 'exampleProject',
              batchConfig: {
                ...batchConfig,
                IS_EARLY_ACCESS: true,
                LIMITS: {
                  ...batchConfig.LIMITS,
                  TOTAL_2: undefined,
                },
              },
              batchReports,
            });
          },
          {
            name: 'Error',
            message:
              'Error in project exampleProject: TOTAL_2 missing or empty',
          }
        );
      });
    });

    describe('without INDIVIDUAL_2', () => {
      it('throws an error', () => {
        const config = { ...batchConfig };
        delete config.LIMITS.INDIVIDUAL_2;
        assert.throws(
          () => {
            validateInputs({
              projectsConfig: { exampleProject: projectConfig },
              projectName: 'exampleProject',
              batchConfig: {
                ...batchConfig,
                IS_EARLY_ACCESS: true,
                LIMITS: {
                  ...batchConfig.LIMITS,
                  INDIVIDUAL_2: undefined,
                },
              },
              batchReports,
            });
          },
          {
            name: 'Error',
            message:
              'Error in project exampleProject: INDIVIDUAL_2 missing or empty',
          }
        );
      });
    });
  });
});
