const request = require('supertest')
const app = require('../app')

describe('POST /stake', () => {
    it('should response with 401 status code', async () => {
        await request(app).post('/stake').auth('admin', 'fail').expect(401);

    })

    it('should response with 200 status code', async () => {

        await request(app).post('/stake').auth('admin', 'human-protocol').expect(200);
    })
})


describe('POST /escrow', () => {
    it('should response with 401 status code', async () => {
        await request(app).post('/escrow').auth('admin', 'fail').expect(401);

    })

    it('should response with 200 status code', async () => {

        await request(app).post('/escrow').auth('admin', 'human-protocol').expect(200);
    })
})