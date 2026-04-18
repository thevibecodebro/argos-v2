import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CallProcessingRepository } from "./calls/repository";
import { getWorkerEnv } from "./env";
import { pollCallProcessingJobs } from "./jobs/poll-call-processing-jobs";
import { processCallJob } from "./jobs/process-call-job";

function loadLocalWorkerEnvFiles() {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }

  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const candidates = [
    resolve(repoRoot, "apps/web/.env"),
    resolve(repoRoot, "apps/web/.env.local"),
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      process.loadEnvFile(filePath);
    }
  }
}

loadLocalWorkerEnvFiles();

const env = getWorkerEnv();

if (env.callProcessingEnabled) {
  const repository = new CallProcessingRepository();

  void pollCallProcessingJobs({
    repository,
    pollIntervalMs: env.pollIntervalMs,
    processJob: async (job) => {
      try {
        await processCallJob({
          env,
          job,
          repository,
        });
      } catch (error) {
        console.error(`Call processing job ${job.id} failed`, error);
      }
    },
  }).catch((error) => {
    console.error("Call processing poll loop stopped", error);
  });
}

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(
      JSON.stringify({
        ok: true,
        service: "@argos-v2/worker",
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  response.writeHead(404, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify({ ok: false, error: "Not Found" }));
});

server.listen(env.port, env.host, () => {
  console.log(
    `@argos-v2/worker listening on http://${env.host}:${env.port} in ${env.nodeEnv}`,
  );
});
