/**
 * Bun worker: load a schema partition and print compiled IR as JSON.
 * Invoked when the Astro config hook runs under Node (extensionless TS imports).
 *
 * Usage: bun ./load-partition-worker.ts <absolute-partition-path>
 */
import { loadSchemaPartition } from "./load-schema-partition";

const partitionPath = process.argv[2];
if (!partitionPath) {
	process.stderr.write("usage: load-partition-worker.ts <partition-path>\n");
	process.exit(2);
}

const ir = await loadSchemaPartition(partitionPath);
process.stdout.write(JSON.stringify(ir));
