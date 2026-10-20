import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const base = (restaurantId = 'r1') => `/api/v1/restaurants/${restaurantId}/tables`

const token = (role: string, restaurantId: string | null = 'r1', id = `${role}-1`) =>
    `Bearer ${jwt.sign({ id, role, restaurantId }, process.env.JWT_SECRET || 'super-secret-resttek-key')}`

const tokens = {
    admin: token('admin', null),
    manager: token('manager'),
    camarero: token('camarero'),
    cocinero: token('cocinero'),
    cliente: token('cliente', null, 'c1')
}

async function insertRestaurant(id: string) {
    await dbConfig.run(
        'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', 'now', 'now']
    )
}

async function insertTable(id: string, restaurantId: string, number: number, capacity = 4, status = 'libre') {
    await dbConfig.run(
        'INSERT INTO restaurant_tables (id, restaurant_id, number, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, restaurantId, number, capacity, status, 'now', 'now']
    )
}

describe('Rutas de mesas: roles y alcance', () => {
    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        await dbConfig.initialize()
        await insertRestaurant('r1')
        await insertRestaurant('r2')
    })

    beforeEach(async () => {
        await dbConfig.run('DELETE FROM order_items')
        await dbConfig.run('DELETE FROM orders')
        await dbConfig.run('DELETE FROM restaurant_tables')
        await insertTable('t1', 'r1', 1)
        await insertTable('t2', 'r2', 1)
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('responds 401 without a token', async () => {
        const res = await request(app).get(base())

        expect(res.status).toBe(401)
    })

    describe('cocinero (solo lectura)', () => {
        it.each([
            ['GET', base()],
            ['GET', `${base()}/t1`],
            ['GET', `${base()}/t1/orders`]
        ])('can %s %s', async (_method, url) => {
            expect((await request(app).get(url).set('Authorization', tokens.cocinero)).status).toBe(200)
        })

        it('cannot create, update, delete, change status, occupy or release', async () => {
            const auth = tokens.cocinero
            expect((await request(app).post(base()).set('Authorization', auth).send({ number: 9, capacity: 2 })).status).toBe(403)
            expect((await request(app).put(`${base()}/t1`).set('Authorization', auth).send({ number: 1, capacity: 2 })).status).toBe(403)
            expect((await request(app).delete(`${base()}/t1`).set('Authorization', auth)).status).toBe(403)
            expect((await request(app).patch(`${base()}/t1/status`).set('Authorization', auth).send({ status: 'reservada' })).status).toBe(403)
            expect((await request(app).post(`${base()}/t1/occupy`).set('Authorization', auth).send({ partySize: 2 })).status).toBe(403)
            expect((await request(app).post(`${base()}/t1/release`).set('Authorization', auth)).status).toBe(403)
        })
    })

    describe('camarero', () => {
        it('can change the status and occupy, but not manage tables', async () => {
            const auth = tokens.camarero
            expect((await request(app).patch(`${base()}/t1/status`).set('Authorization', auth).send({ status: 'reservada' })).status).toBe(200)
            await request(app).patch(`${base()}/t1/status`).set('Authorization', auth).send({ status: 'libre' })
            expect((await request(app).post(`${base()}/t1/occupy`).set('Authorization', auth).send({ partySize: 2 })).status).toBe(200)
            expect((await request(app).post(`${base()}/t1/release`).set('Authorization', auth)).status).toBe(200)
            expect((await request(app).post(base()).set('Authorization', auth).send({ number: 9, capacity: 2 })).status).toBe(403)
            expect((await request(app).put(`${base()}/t1`).set('Authorization', auth).send({ number: 1, capacity: 2 })).status).toBe(403)
            expect((await request(app).delete(`${base()}/t1`).set('Authorization', auth)).status).toBe(403)
        })

        it('cannot use force=true', async () => {
            await request(app).post(`${base()}/t1/occupy`).set('Authorization', tokens.camarero).send({ partySize: 2 })

            const res = await request(app).patch(`${base()}/t1/status?force=true`)
                .set('Authorization', tokens.camarero).send({ status: 'libre' })

            expect(res.status).toBe(403)
        })
    })

    describe('manager', () => {
        it('manages the tables of its restaurant and can force', async () => {
            const auth = tokens.manager
            const created = await request(app).post(base()).set('Authorization', auth).send({ number: 9, capacity: 2 })
            expect(created.status).toBe(201)
            expect((await request(app).put(`${base()}/${created.body.id}`).set('Authorization', auth).send({ number: 9, capacity: 6 })).body.capacity).toBe(6)
            expect((await request(app).patch(`${base()}/t1/status?force=true`).set('Authorization', auth).send({ status: 'ocupada' })).status).toBe(200)
            expect((await request(app).delete(`${base()}/${created.body.id}`).set('Authorization', auth)).status).toBe(204)
        })
    })

    describe('alcance por restaurante', () => {
        it('an admin can operate on any restaurant', async () => {
            expect((await request(app).get(base('r2')).set('Authorization', tokens.admin)).status).toBe(200)
            expect((await request(app).post(base('r2')).set('Authorization', tokens.admin).send({ number: 5, capacity: 2 })).status).toBe(201)
        })

        it.each(['manager', 'camarero', 'cocinero'] as const)('a %s gets 403 on another restaurant', async role => {
            const res = await request(app).get(base('r2')).set('Authorization', tokens[role])

            expect(res.status).toBe(403)
        })

        it('a manager gets 403 creating tables in another restaurant', async () => {
            const res = await request(app).post(base('r2')).set('Authorization', tokens.manager).send({ number: 5, capacity: 2 })

            expect(res.status).toBe(403)
        })

        it('a table of another restaurant is not found through this restaurant', async () => {
            const res = await request(app).get(`${base()}/t2`).set('Authorization', tokens.manager)

            expect(res.status).toBe(404)
            expect(res.body.error).toBe('TableNotFoundError')
        })

        it('a client is not restricted to a restaurant', async () => {
            expect((await request(app).get(`${base('r2')}/available?partySize=2`).set('Authorization', tokens.cliente)).status).toBe(200)
        })
    })

    describe('cliente', () => {
        it('cannot list, create or change the status of tables', async () => {
            const auth = tokens.cliente
            expect((await request(app).get(base()).set('Authorization', auth)).status).toBe(403)
            expect((await request(app).get(`${base()}/t1`).set('Authorization', auth)).status).toBe(403)
            expect((await request(app).post(base()).set('Authorization', auth).send({ number: 9, capacity: 2 })).status).toBe(403)
            expect((await request(app).patch(`${base()}/t1/status`).set('Authorization', auth).send({ status: 'libre' })).status).toBe(403)
        })

        it('GET /mine is only for clients', async () => {
            expect((await request(app).get(`${base()}/mine`).set('Authorization', tokens.camarero)).status).toBe(403)
            const res = await request(app).get(`${base()}/mine`).set('Authorization', tokens.cliente)
            expect(res.status).toBe(404)
            expect(res.body.error).toBe('TableNotFoundError')
        })

        it('cannot force a release', async () => {
            const res = await request(app).post(`${base()}/t1/release?force=true`).set('Authorization', tokens.cliente)

            expect(res.status).toBe(403)
        })
    })

    describe('/available y /mine se declaran antes de /:id', () => {
        it('/available is not captured as an id', async () => {
            const res = await request(app).get(`${base()}/available?partySize=2`).set('Authorization', tokens.camarero)

            expect(res.status).toBe(200)
            expect(res.body.map((t: any) => t.id)).toEqual(['t1'])
        })

        it('/available with an invalid partySize responds 400 InvalidPartySizeError', async () => {
            for (const query of ['', '?partySize=0', '?partySize=abc', '?partySize=1.5']) {
                const res = await request(app).get(`${base()}/available${query}`).set('Authorization', tokens.cliente)
                expect(res.status).toBe(400)
                expect(res.body.error).toBe('InvalidPartySizeError')
            }
        })
    })

    describe('errores', () => {
        it('400 InvalidTableError with invalid capacity', async () => {
            const res = await request(app).post(base()).set('Authorization', tokens.manager).send({ number: 5, capacity: 0 })

            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidTableError')
        })

        it('409 DuplicatedTableNumberError with a repeated number', async () => {
            const res = await request(app).post(base()).set('Authorization', tokens.manager).send({ number: 1, capacity: 2 })

            expect(res.status).toBe(409)
            expect(res.body.error).toBe('DuplicatedTableNumberError')
        })

        it('404 RestaurantNotFoundError creating in a missing restaurant (admin)', async () => {
            const res = await request(app).post(base('nope')).set('Authorization', tokens.admin).send({ number: 1, capacity: 2 })

            expect(res.status).toBe(404)
            expect(res.body.error).toBe('RestaurantNotFoundError')
        })

        it('filters and pagination in the list', async () => {
            await insertTable('t3', 'r1', 2, 8, 'reservada')
            await insertTable('t4', 'r1', 3, 6)
            const auth = tokens.camarero

            expect((await request(app).get(`${base()}?status=reservada`).set('Authorization', auth)).body.map((t: any) => t.id)).toEqual(['t3'])
            expect((await request(app).get(`${base()}?minCapacity=6`).set('Authorization', auth)).body.map((t: any) => t.id)).toEqual(['t3', 't4'])
            expect((await request(app).get(`${base()}?limit=1&offset=1`).set('Authorization', auth)).body.map((t: any) => t.id)).toEqual(['t3'])
            expect((await request(app).get(`${base()}?status=cerrada`).set('Authorization', auth)).status).toBe(400)
            expect((await request(app).get(`${base()}?limit=500`).set('Authorization', auth)).status).toBe(400)
            expect((await request(app).get(`${base()}?include=otra`).set('Authorization', auth)).status).toBe(400)
        })

        it('DELETE of a free table responds 204 and of an occupied one 409 TableInUseError', async () => {
            await insertTable('t5', 'r1', 5, 4, 'ocupada')

            expect((await request(app).delete(`${base()}/t1`).set('Authorization', tokens.manager)).status).toBe(204)
            const res = await request(app).delete(`${base()}/t5`).set('Authorization', tokens.manager)
            expect(res.status).toBe(409)
            expect(res.body).toMatchObject({ error: 'TableInUseError', reason: 'ocupada' })
        })
    })
})
