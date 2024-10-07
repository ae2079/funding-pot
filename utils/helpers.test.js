import '../env.js';

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { getProjectNames } from './helpers.js';

describe('#getProjectNames', () => {
  it('returns an array of project names', () => {
    const projectNames = getProjectNames();
    assert.ok(projectNames.includes('STATIC_TEST_PROJECT_1'));
    assert.ok(projectNames.includes('STATIC_TEST_PROJECT_2'));
  });
});
