import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('items (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, lists, updates and deletes an item', async () => {
    const sku = `SKU-${Date.now()}`;

    const create = await request(app.getHttpServer())
      .post('/example/items')
      .send({ name: { ar: 'منتج', en: 'Item' }, sku, price: 10 })
      .expect(201);
    expect(create.body.status).toBe('success');
    expect(create.body.data.sku).toBe(sku);
    const id = create.body.data.id as string;

    const list = await request(app.getHttpServer()).get('/example/items').expect(200);
    expect(list.body.status).toBe('success');
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.some((it: { id: string }) => it.id === id)).toBe(true);

    const update = await request(app.getHttpServer())
      .patch(`/example/items/${id}`)
      .send({ price: 20 })
      .expect(200);
    expect(update.body.data.price).toBe(20);

    await request(app.getHttpServer()).delete(`/example/items/${id}`).expect(204);
  });
});
