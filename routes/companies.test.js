// connect to right DB --- set before loading db.js
process.env.NODE_ENV = "test";

// npm packages
const request = require("supertest");

// app imports
const app = require("../app");
const db = require("../db");

let testCompany;

beforeEach(async function () {
  const code = "CompanyCode";
  const name = "CompanyName";
  const description = "This is a description of the company.";
  let result = await db.query(
    `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
    [code, name, description]
  );
  testCompany = result.rows[0];
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

describe("GET /companies", function () {
  test("Gets a list of 1 company", async function () {
    const response = await request(app).get("/companies");
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      companies: [{ code: testCompany.code, name: testCompany.name }],
    });
  });
});

describe("GET /companies/:code", function () {
  test("Gets a single company", async function () {
    const response = await request(app).get(`/companies/${testCompany.code}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      company: testCompany,
      invoices: [],
    });
  });

  test("Responds with 404 if can't find company", async function () {
    const response = await request(app).get(`/companies/123`);
    expect(response.statusCode).toEqual(404);
  });
});

describe("POST /companies", function () {
  test("Creates a new company", async function () {
    const response = await request(app).post("/companies").send({
      code: "alpha",
      name: "Google",
      description: "Search engine and more",
    });
    expect(response.statusCode).toEqual(201);
    expect(response.body).toEqual({
      company: {
        code: "alpha",
        name: "Google",
        description: "Search engine and more",
      },
    });
  });
  test("Responds with 400 if code is not included", async function () {
    const response = await request(app).post("/companies").send({
      name: "Google",
      description: "Search engine and more",
    });
    expect(response.statusCode).toEqual(400);
  });
  test("Responds with 400 if name is not included", async function () {
    const response = await request(app).post("/companies").send({
      code: "alpha",
      description: "Search engine and more",
    });
    expect(response.statusCode).toEqual(400);
  });
  test("Responds with 400 if description is not included", async function () {
    const response = await request(app).post("/companies").send({
      code: "alpha",
      name: "Google",
    });
    expect(response.statusCode).toEqual(400);
  });
});

describe("PUT /companies/:code", function () {
  test("Updates a single company", async function () {
    const response = await request(app)
      .put(`/companies/${testCompany.code}`)
      .send({ name: "NewName", description: "NEW description" });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      company: {
        code: "CompanyCode",
        name: "NewName",
        description: "NEW description",
      },
    });
  });
  test("Responds with 404 if can't find company", async function () {
    const response = await request(app)
      .put(`/companies/123`)
      .send({ name: "NewName", description: "NEW description" });
    expect(response.statusCode).toEqual(404);
  });
  test("Responds with 400 if name is not included", async function () {
    const response = await request(app)
      .put(`/companies/${testCompany.code}`)
      .send({ description: "NEW description" });
    expect(response.statusCode).toEqual(400);
  });
  test("Responds with 400 if description is not included", async function () {
    const response = await request(app)
      .put(`/companies/${testCompany.code}`)
      .send({ name: "NewName" });
    expect(response.statusCode).toEqual(400);
  });
});

describe("DELETE /companies/:code", function () {
  test("Deletes a single company", async function () {
    const response = await request(app).delete(
      `/companies/${testCompany.code}`
    );
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({ status: "deleted" });
  });
  test("Responds with 404 if can't find company", async function () {
    const response = await request(app).delete(`/companies/123`);
    expect(response.statusCode).toEqual(404);
  });
});
