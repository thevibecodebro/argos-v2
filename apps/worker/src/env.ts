type WorkerEnvSource = Partial<Record<string, string | undefined>>;

export type WorkerEnv = {
  host: string;
  port: number;
  nodeEnv: string;
};

function parsePort(value: string | undefined): number {
  if (!value) {
    return 8787;
  }

  const port = Number.parseInt(value, 10);

  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT environment variable: ${value}`);
  }

  return port;
}

export function getWorkerEnv(env: WorkerEnvSource = process.env): WorkerEnv {
  return {
    host: env.HOST || "0.0.0.0",
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV || "development",
  };
}
