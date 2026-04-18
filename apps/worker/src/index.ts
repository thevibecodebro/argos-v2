import { createServer } from "node:http";
import { getWorkerEnv } from "./env";

const env = getWorkerEnv();

if (env.callProcessingEnabled) {
  console.warn(
    "CALL_PROCESSING_ENABLED is set, but the job processor is not wired until Task 7. Polling remains disabled.",
  );
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
