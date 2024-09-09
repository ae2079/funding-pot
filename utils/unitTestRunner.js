import { spawn } from 'child_process';
import glob from 'glob';

// Exclude the specific test file
const excludeFile = 'steps/00_main.test.js';
const pattern = './**/*.test.js';

// Get all test files, excluding the one you want
glob(pattern, { ignore: excludeFile }, (err, files) => {
  if (err) {
    console.error('Error fetching test files:', err);
    return;
  }

  if (files.length === 0) {
    console.log('No test files found.');
    return;
  }

  // Run tests using Node's test runner
  const testProcess = spawn('node', ['--test', ...files], {
    stdio: 'inherit',
  });

  testProcess.on('exit', (code) => {
    console.log(`Test process exited with code ${code}`);
  });
});
