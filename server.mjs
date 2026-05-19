/* global process */
import { createRequire } from "node:module";

process.env.HOSTNAME = "0.0.0.0";

const require = createRequire(import.meta.url);
require("./.next/standalone/server.js");
