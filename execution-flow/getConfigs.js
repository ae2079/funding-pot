import fs from 'fs';
import path from 'path';

export const getConfigs = (batch) => {
  // load project config (= project-specific constants)
  const projectsConfig = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `./data/input/projects.json`)
    )
  );

  // load batch config (batch-specific constants such as allowlist, start & end block, vesting schedule)
  const batchConfig = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `./data/input/batches/${batch}.json`)
    )
  );

  return { projectsConfig, batchConfig };
};
