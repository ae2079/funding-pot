import '../env.js';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { instantiateServices } from './instantiateServices.js';

describe('#instantiateServices', () => {
  const projectConfig = {
    ORCHESTRATOR: '0x49BC19af25056Db61cfB4035A23ce3B509DF46B3',
    SAFE: '0x4ffe42c1666e50104e997DD07E43c673FD39C81d',
  };

  describe('with all params set', () => {
    it('instantiates the services', () => {
      instantiateServices(projectConfig);
    });
  });
});
