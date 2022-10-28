// connect to right DB --- set before loading db.js
process.env.NODE_ENV = "test";

// npm packages
const request = require("supertest");

// app imports
const app = require("../app");
const db = require("../db");

let testCompany;
let testInvoice;

beforeEach(async function () {
  const code = "CompanyCode";
  const name = "CompanyName";
  const description = "This is a description of the company.";
  let result = await db.query(
    `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
    [code, name, description]
  );
  testCompany = result.rows[0];

  const amt = 123;
  let invoice = await db.query(
    `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`,
    [code, amt]
  );
  testInvoice = invoice.rows[0];
});

afterEach(async function () {
  // delete any data created by test
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM invoices");
});

afterAll(async function () {
  // close db connection
  await db.end();
});

describe("GET /invoices", function () {
  test("Gets a list of 1 invoice", async function () {
    const response = await request(app).get("/invoices");
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      invoices: [{ id: testInvoice.id, comp_code: testInvoice.comp_code }],
    });
  });
});

describe("GET /invoices/:id", function () {
  test("Gets a single invoice", async function () {
    const response = await request(app).get(`/invoices/${testInvoice.id}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      invoice: {
        id: testInvoice.id,
        amt: testInvoice.amt,
        paid: testInvoice.paid,
        add_date: expect.any(String),
        paid_date: testInvoice.paid_date,
        company: {
          code: testCompany.code,
          name: testCompany.name,
          description: testCompany.description,
        },
      },
    });
  });

  test("Responds with 404 if can't find invoice", async function () {
    const response = await request(app).get(`/invoices/0`);
    expect(response.statusCode).toEqual(404);
  });
});

describe("POST /invoices", function () {
  test("Creates a new invoice", async function () {
    const response = await request(app).post("/invoices").send({
      comp_code: testCompany.code,
      amt: 120,
    });
    expect(response.statusCode).toEqual(201);
    expect(response.body).toEqual({
      invoice: {
        id: expect.any(Number),
        comp_code: testCompany.code,
        amt: 120,
        paid: false,
        add_date: expect.any(String),
        paid_date: null,
      },
    });
  });
  test("Responds with 400 if comp_code is not included", async function () {
    const response = await request(app).post("/invoices").send({
      amt: 120,
    });
    expect(response.statusCode).toEqual(400);
  });
  test("Responds with 400 if amt is not included", async function () {
    const response = await request(app).post("/invoices").send({
      comp_code: testCompany.code,
    });
    expect(response.statusCode).toEqual(400);
  });
});

describe("PUT /invoices/:id", function () {
  test("Updates a single invoice", async function () {
    const response = await request(app)
      .put(`/invoices/${testInvoice.id}`)
      .send({ amt: 456, paid: true });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      invoice: {
        id: expect.any(Number),
        comp_code: testCompany.code,
        amt: 456,
        paid: true,
        add_date: expect.any(String),
        paid_date: expect.any(String),
      },
    });
  });
  test("Responds with 404 if can't find invoice", async function () {
    const response = await request(app)
      .put(`/invoices/0`)
      .send({ amt: 456, paid: true });
    expect(response.statusCode).toEqual(404);
  });
  test("Responds with 400 if amt is not included", async function () {
    const response = await request(app)
      .put(`/invoices/${testInvoice.id}`)
      .send({ paid: false });
    expect(response.statusCode).toEqual(400);
  });
  test("Responds with 400 if paid is not included", async function () {
    const response = await request(app)
      .put(`/invoices/${testInvoice.id}`)
      .send({ amt: 456 });
    expect(response.statusCode).toEqual(400);
  });
});

describe("DELETE /invoices/:id", function () {
  test("Deletes a single invoice", async function () {
    const response = await request(app).delete(`/invoices/${testInvoice.id}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({ status: "deleted" });
  });
  test("Responds with 404 if can't find invoice", async function () {
    const response = await request(app).delete(`/invoices/0`);
    expect(response.statusCode).toEqual(404);
  });
});
