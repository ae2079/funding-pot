import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const loadInputs = (season, projectName, batch) => {
  return {
    ...loadConfigs(batch, projectName),
    ...loadbatchReports(projectName, batch),
  };
};

const loadConfigs = (batch, projectName) => {
  const projectsConfig = loadProjectsConfig();
  return {
    projectsConfig,
    batchConfig: projectsConfig[projectName].BATCH_CONFIGS[batch],
  };
};

const loadbatchReports = (projectName) => {
  const batchReportsPath = path.join(
    __dirname,
    `${getBasePath('output')}/${projectName}`
  );

  const batchReports = {};

  try {
    const files = fs.readdirSync(batchReportsPath);
    files.forEach((file) => {
      const filePath = path.join(batchReportsPath, file);
      const report = fs.readFileSync(filePath, 'utf8');
      const key = path.basename(file, '.json');
      batchReports[key] = JSON.parse(report);
    });
  } catch (err) {
    console.info('❗ No previous reports found');
  }
  return { batchReports };
};

const getBasePath = (dataType) =>
  `../../data/${process.env.NODE_ENV}/${dataType}`;

export const loadProjectsConfig = () => {
  const basePath = getBasePath('input');
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, `${basePath}/projects.json`))
  );
};
