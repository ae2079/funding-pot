import '../../../env.js';

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { closeWorkflow } from './closeWorkflow.js';

const [, , PROJECT_NAME] = process.argv;

const projectsConfig = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      `../../../data/${process.env.NODE_ENV}/input/projects.json`
    ),
    'utf8'
  )
);

const runScript = async () => {
  const projectName = PROJECT_NAME;
  // iterate over all projects
  const projectConfig = projectsConfig[projectName];

  if (!projectConfig) {
    console.error(`Project ${projectName} not found`);
    return;
  }

  await closeWorkflow(projectName, projectsConfig);
};

runScript();
