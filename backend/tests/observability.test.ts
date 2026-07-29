import { PassThrough } from 'node:stream';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runAuditedOperation } from '../src/audit/audit-logger.js';
import { buildApp } from '../src/app.js';
import { environment } from '../src/config/environment.js';
import { createLogger } from '../src/config/logger.js';
import { AppError } from '../src/errors/app-error.js';
import { ErrorCode } from '../src/errors/error-codes.js';

interface LogRecord {
  level: number;
  time: number;
  event?: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  audit?: {
    actorId: string | null;
    action: string;
    resourceType: string;
    resourceId?: string;
    timestamp: string;
    outcome: string;
    requestId: string;
    errorCode?: string;
  };
}

describe('structured observability', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const output: string[] = [];
  const destination = new PassThrough();

  beforeAll(async () => {
    destination.on('data', (chunk: Buffer) => {
      output.push(chunk.toString());
    });
    app = await buildApp({
      connectionCheck: () => Promise.resolve(),
      logger: createLogger(destination),
    });
    app.post('/api/v1/test-audit-success', async (request) => {
      const result = await runAuditedOperation(
        request,
        {
          actorId: 'user-123',
          action: 'habit.create',
          resourceType: 'habit',
        },
        () => Promise.resolve({ id: 'habit-123' }),
        (value) => value.id,
      );
      return { success: true, data: result };
    });
    app.post('/api/v1/test-audit-failure', async (request) => {
      await runAuditedOperation(
        request,
        {
          actorId: 'user-123',
          action: 'goal.update',
          resourceType: 'goal',
          resourceId: 'goal-123',
        },
        () =>
          Promise.reject(
            new AppError({
              statusCode: 409,
              code: ErrorCode.Conflict,
              message: 'The update conflicts with current state.',
            }),
          ),
      );
    });
    app.get('/api/v1/test-internal-error', () => {
      throw new Error(`Dependency failed: ${environment.BETTER_AUTH_SECRET}`);
    });
  });

  afterAll(async () => {
    await app.close();
    destination.end();
  });

  function records() {
    return output
      .join('')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LogRecord);
  }

  it('emits machine-readable correlated request and audit events', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/test-audit-success?token=must-not-appear',
      headers: { 'x-request-id': 'audit-request-123' },
      payload: { password: 'must-not-appear' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('audit-request-123');

    const emitted = records();
    const audit = emitted.find(
      (record) =>
        record.event === 'audit.event' &&
        record.audit?.requestId === 'audit-request-123',
    );
    expect(audit?.level).toBe(30);
    expect(typeof audit?.time).toBe('number');
    expect(audit?.audit).toMatchObject({
      actorId: 'user-123',
      action: 'habit.create',
      resourceType: 'habit',
      resourceId: 'habit-123',
      outcome: 'success',
      requestId: 'audit-request-123',
    });
    expect(typeof audit?.audit?.timestamp).toBe('string');

    const completion = emitted.find(
      (record) =>
        record.event === 'http.request.completed' &&
        record.requestId === 'audit-request-123',
    );
    expect(completion).toMatchObject({
      level: 30,
      method: 'POST',
      path: '/api/v1/test-audit-success',
      status: 200,
    });
    expect(typeof completion?.time).toBe('number');
    expect(typeof completion?.durationMs).toBe('number');
    expect(output.join('')).not.toContain('must-not-appear');
  });

  it('records failed audit outcomes without changing public errors', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/test-audit-failure',
      headers: { 'x-request-id': 'audit-failure-123' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'CONFLICT' },
    });
    const audit = records().find(
      (record) =>
        record.event === 'audit.event' &&
        record.audit?.requestId === 'audit-failure-123',
    );
    expect(audit?.audit).toMatchObject({
      actorId: 'user-123',
      action: 'goal.update',
      resourceType: 'goal',
      resourceId: 'goal-123',
      outcome: 'failure',
      errorCode: 'CONFLICT',
      requestId: 'audit-failure-123',
    });
  });

  it('logs structured internal errors with sensitive values redacted', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/test-internal-error',
      headers: { 'x-request-id': 'internal-error-123' },
    });

    expect(response.statusCode).toBe(500);
    const error = records().find(
      (record) =>
        record.event === 'http.request.error' &&
        record.requestId === 'internal-error-123',
    );
    expect(error).toMatchObject({
      level: 50,
      method: 'GET',
      path: '/api/v1/test-internal-error',
      status: 500,
    });
    expect(output.join('')).not.toContain(environment.BETTER_AUTH_SECRET);
    expect(output.join('')).toContain('[REDACTED]');
  });
});
