import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getConfigs = (batch) => {
  const dataDir =
    process.env.NODE_ENV === 'production' ? 'production' : 'test';

  // load project config (= project-specific constants)
  const projectsConfig = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        `../../data/${dataDir}/input/projects.json`
      )
    )
  );

  // load allowlist
  const allowlist = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        `../../data/${dataDir}/input/allowlist.json`
      )
    )
  );

  // load batch config (batch-specific constants such as allowlist, start & end block, vesting schedule)
  const batchConfig = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        `../../data/${dataDir}/input/batches/${batch}.json`
      )
    )
  );

  return { projectsConfig, allowlist, batchConfig };
};
