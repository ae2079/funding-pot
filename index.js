import './env.js';
import { main } from './steps/main.js';
import { getProjectNames } from './utils/helpers.js';

const [, , SEASON, PROJECT_NAME, BATCH] = process.argv;
const { TYPE } = process.env;

const runScript = async () => {
  console.info(
    `🙌 Starting script for batch ${BATCH} and ${
      TYPE === 'all' ? 'all projects' : PROJECT_NAME
    }`
  );

  if (TYPE === 'project') {
    await main(PROJECT_NAME, BATCH);
  } else if (TYPE === 'all') {
    const projectNames = getProjectNames();
    for (const projectName of projectNames) {
      await main(projectName, BATCH);
    }
  }
};

runScript();
