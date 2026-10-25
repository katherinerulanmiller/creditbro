import {homedir} from 'node:os';import {join} from 'node:path';
export const RUNTIME_ROOT=process.env.CREDITBRO_RUNTIME_DIR||join(homedir(),'.creditbro');
export const SETTINGS_DIR=process.env.CREDITBRO_SETTINGS_DIR||join(RUNTIME_ROOT,'settings');
