#!/usr/bin/env node
// __CARD_ID__ command line. Thin wrapper: parse args, read files, call engine, print JSON.
import { attempt } from './kit/core.mjs';
import { parseArgs, readBytes, finish, usage } from './kit/node.mjs';
import { run } from './engine/index.mjs';

const USAGE = 'node cli.mjs run <file>';
const args = parseArgs();
const [command, file] = args._;
if (command !== 'run' || !file) usage(USAGE);
finish(await attempt(() => run(readBytes(file))));
