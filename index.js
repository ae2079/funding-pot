import './env.js';
import { main } from './steps/00_main.js';

const [, , PROJECT_NAME, BATCH] = process.argv;

main(PROJECT_NAME, BATCH);
