import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ACCESS_TOKEN_COOKIE } from '@core/auth';
import {
  createLocalStorageDriver,
  createS3StorageDriver,
  type ObjectClient,
  type StorageDriver,
} from '@core/files';
import { bearer, createApp, createFakeDelegate } from './session-harness.js';

const NOTES = Buffer.from('hello file');

interface RecordedPut {
  name: string;
  mediaType: string;
  bytes: number;
}

/** In-test stand-in for the storage driver. It records puts and drops. */
function recordingDriver(
  stored: { path: string; url: string } = {
    path: 'memory/notes.txt',
    url: 'https://files.test/notes.txt',
  },
) {
  const puts: RecordedPut[] = [];
  const dropped: string[] = [];
  const driver: StorageDriver = {
    async put(object) {
      puts.push({
        name: object.name,
        mediaType: object.mediaType,
        bytes: object.bytes.byteLength,
      });
      return stored;
    },
    async drop(path) {
      dropped.push(path);
    },
  };
  return { driver, puts, dropped, stored };
}

function upload(
  server: ReturnType<INestApplication['getHttpServer']>,
  cookie: string | undefined,
  body: Buffer,
  filename: string,
  contentType: string,
) {
  const req = request(server).post('/files');
  if (cookie) req.set('Cookie', cookie);
  return req.attach('file', body, { filename, contentType });
}

describe('files (e2e)', () => {
  let app: INestApplication;
  const roots: string[] = [];

  afterEach(async () => {
    if (app) await app.close();
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('lets a user with files.create upload a file and read back its name, type, size, url, and uploader', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 1024, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerCookie = bearer(owner, ACCESS_TOKEN_COOKIE);

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'uploader',
        label: { ar: 'رافع', en: 'Uploader' },
        permissions: ['files.create'],
      })
      .expect(201);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'uploader' })
      .expect(201);

    const session = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);

    const uploaded = await upload(
      server,
      bearer(session, ACCESS_TOKEN_COOKIE),
      NOTES,
      'notes.txt',
      'text/plain',
    ).expect(201);

    expect(uploaded.body).toEqual({
      status: 'success',
      message: 'File uploaded',
      data: {
        id: expect.any(String),
        name: 'notes.txt',
        type: 'text/plain',
        size: 10,
        path: 'memory/notes.txt',
        url: 'https://files.test/notes.txt',
        uploadedById: graceId,
      },
    });
  });

  it('refuses an upload from a caller with no session', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 1024, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();

    const uploaded = await upload(server, undefined, NOTES, 'notes.txt', 'text/plain').expect(401);
    expect(uploaded.body.status).toBe('error');
    expect(storage.puts).toEqual([]);

    const read = await request(server).get('/files/missing').expect(401);
    expect(read.body.status).toBe('error');
    const removed = await request(server).delete('/files/missing').expect(401);
    expect(removed.body.status).toBe('error');
  });

  it('refuses an upload, a read, and a delete when the signed-in user lacks that permission', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 1024, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerCookie = bearer(owner, ACCESS_TOKEN_COOKIE);
    const uploaded = await upload(server, ownerCookie, NOTES, 'notes.txt', 'text/plain').expect(
      201,
    );
    const id = uploaded.body.data.id as string;

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'reader',
        label: { ar: 'قارئ', en: 'Reader' },
        permissions: ['files.read'],
      })
      .expect(201);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');
    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'reader' })
      .expect(201);
    const readerSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    const readerCookie = bearer(readerSession, ACCESS_TOKEN_COOKIE);

    const refusedUpload = await upload(
      server,
      readerCookie,
      NOTES,
      'other.txt',
      'text/plain',
    ).expect(403);
    expect(refusedUpload.body.status).toBe('error');
    expect(storage.puts).toHaveLength(1);

    const refusedDelete = await request(server)
      .delete(`/files/${id}`)
      .set('Cookie', readerCookie)
      .expect(403);
    expect(refusedDelete.body.status).toBe('error');
    expect(storage.dropped).toEqual([]);

    const read = await request(server).get(`/files/${id}`).set('Cookie', readerCookie).expect(200);
    expect(read.body.data).toEqual(uploaded.body.data);

    await request(server)
      .patch('/auth/roles/reader')
      .set('Cookie', ownerCookie)
      .send({ label: { ar: 'رافع', en: 'Uploader' }, permissions: ['files.create'] })
      .expect(200);
    const uploaderSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    const refusedRead = await request(server)
      .get(`/files/${id}`)
      .set('Cookie', bearer(uploaderSession, ACCESS_TOKEN_COOKIE))
      .expect(403);
    expect(refusedRead.body.status).toBe('error');
  });

  it('lets the owner upload, read, and delete a file, and the driver drops the object', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 1024, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const cookie = bearer(owner, ACCESS_TOKEN_COOKIE);
    const ownerId = owner.body.data.id;
    if (typeof ownerId !== 'string') throw new Error('registered user is missing an id');

    const uploaded = await upload(server, cookie, NOTES, 'notes.txt', 'text/plain').expect(201);
    expect(uploaded.body.data.uploadedById).toBe(ownerId);
    const id = uploaded.body.data.id as string;

    const read = await request(server).get(`/files/${id}`).set('Cookie', cookie).expect(200);
    expect(read.body.status).toBe('success');
    expect(read.body.data).toEqual(uploaded.body.data);

    const removed = await request(server).delete(`/files/${id}`).set('Cookie', cookie).expect(200);
    expect(removed.body.status).toBe('success');
    expect(storage.dropped).toEqual(['memory/notes.txt']);

    const missing = await request(server).get(`/files/${id}`).set('Cookie', cookie).expect(404);
    expect(missing.body.status).toBe('error');
  });

  it('refuses an empty upload and stores nothing', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 1024, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const refused = await upload(
      server,
      bearer(owner, ACCESS_TOKEN_COOKIE),
      Buffer.alloc(0),
      'empty.txt',
      'text/plain',
    ).expect(400);
    expect(refused.body.status).toBe('error');
    expect(storage.puts).toEqual([]);
  });

  it('refuses an upload over the size limit and stores nothing', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 4, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const refused = await upload(
      server,
      bearer(owner, ACCESS_TOKEN_COOKIE),
      Buffer.from('hello'),
      'notes.txt',
      'text/plain',
    ).expect(400);
    expect(refused.body.status).toBe('error');
    expect(storage.puts).toEqual([]);
  });

  it('refuses a disallowed media type and stores nothing', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 1024, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const refused = await upload(
      server,
      bearer(owner, ACCESS_TOKEN_COOKIE),
      NOTES,
      'notes.zip',
      'application/zip',
    ).expect(400);
    expect(refused.body.status).toBe('error');
    expect(storage.puts).toEqual([]);
  });

  it('does not offer a way to edit a file in place', async () => {
    const storage = recordingDriver();
    app = await createApp(createFakeDelegate(), {
      files: { storage: storage.driver, maxBytes: 1024, allowedTypes: ['text/plain'] },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const cookie = bearer(owner, ACCESS_TOKEN_COOKIE);
    const uploaded = await upload(server, cookie, NOTES, 'notes.txt', 'text/plain').expect(201);
    const id = uploaded.body.data.id as string;

    await request(server)
      .put(`/files/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'other.txt' })
      .expect(404);
    await request(server)
      .patch(`/files/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'other.txt' })
      .expect(404);

    const still = await request(server).get(`/files/${id}`).set('Cookie', cookie).expect(200);
    expect(still.body.data).toEqual(uploaded.body.data);
  });

  it('stores the path and url returned by the local driver', async () => {
    const root = await mkdtemp(join(tmpdir(), 'core-files-'));
    roots.push(root);
    const publicBaseUrl = 'http://uploads.test/files';
    app = await createApp(createFakeDelegate(), {
      files: {
        storage: createLocalStorageDriver({ root, publicBaseUrl }),
        maxBytes: 1024,
        allowedTypes: ['text/plain'],
      },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerId = owner.body.data.id;
    if (typeof ownerId !== 'string') throw new Error('registered user is missing an id');

    const uploaded = await upload(
      server,
      bearer(owner, ACCESS_TOKEN_COOKIE),
      NOTES,
      'notes.txt',
      'text/plain',
    ).expect(201);

    const path = uploaded.body.data.path as string;
    const url = uploaded.body.data.url as string;
    const key = path.slice(root.length).replace(/^[/\\]/, '');
    expect(path.startsWith(root)).toBe(true);
    expect(url).toBe(`${publicBaseUrl}/${key}`);
    expect(uploaded.body.data).toMatchObject({
      name: 'notes.txt',
      type: 'text/plain',
      size: 10,
      uploadedById: ownerId,
    });
    expect(Buffer.from(await readFile(path)).equals(NOTES)).toBe(true);
  });

  it('stores the path and url returned by the S3 driver', async () => {
    const puts: { bucket: string; key: string; contentType: string; body: Uint8Array }[] = [];
    const client: ObjectClient = {
      async putObject(input) {
        puts.push(input);
      },
      async deleteObject() {
        return undefined;
      },
    };
    const publicBaseUrl = 'https://cdn.test/core-files';
    app = await createApp(createFakeDelegate(), {
      files: {
        storage: createS3StorageDriver({ bucket: 'core-files', publicBaseUrl, client }),
        maxBytes: 1024,
        allowedTypes: ['text/plain'],
      },
    });
    const server = app.getHttpServer();
    const owner = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerId = owner.body.data.id;
    if (typeof ownerId !== 'string') throw new Error('registered user is missing an id');

    const uploaded = await upload(
      server,
      bearer(owner, ACCESS_TOKEN_COOKIE),
      NOTES,
      'notes.txt',
      'text/plain',
    ).expect(201);

    const put = puts[0];
    expect(put?.bucket).toBe('core-files');
    expect(put?.contentType).toBe('text/plain');
    expect(put?.body.byteLength).toBe(10);
    expect(uploaded.body.data).toMatchObject({
      name: 'notes.txt',
      type: 'text/plain',
      size: 10,
      path: `s3://core-files/${put?.key}`,
      url: `${publicBaseUrl}/${put?.key}`,
      uploadedById: ownerId,
    });
    expect(uploaded.body.status).toBe('success');
  });
});
