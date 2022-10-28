const express = require("express");
const ExpressError = require("../expressError");
const router = new express.Router();
const db = require("../db");
const slugify = require("slugify");

router.get("/", async function (req, res, next) {
  try {
    const result = await db.query("SELECT code, name FROM companies");
    return res.json({ companies: result.rows });
  } catch (e) {
    return next(e);
  }
});

router.get("/:code", async function (req, res, next) {
  try {
    const compCode = req.params.code;
    const result = await db.query(
      "SELECT c.code, c.name, c.description, i.industry FROM companies AS c LEFT JOIN companies_industries AS ci ON c.code = ci.comp_code LEFT JOIN industries AS i ON ci.ind_code=i.code WHERE c.code=$1",
      [compCode]
    );
    const invoices = await db.query(
      "SELECT id, amt, paid, add_date, paid_date FROM invoices WHERE comp_code=$1",
      [compCode]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Company code not found", 404);
    }
    let { code, name, description } = result.rows[0];
    let industries = result.rows.map((r) => r.industry);
    return res.json({
      company: { code, name, description },
      industries,
      invoices: invoices.rows,
    });
  } catch (e) {
    return next(e);
  }
});

router.post("/", async function (req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      throw new ExpressError(
        "Please include 'code', 'name', and 'description'",
        400
      );
    }
    const result = await db.query(
      `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
      [slugify(name, { lower: true, strict: true }), name, description]
    );
    return res.status(201).json({ company: result.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.put("/:code", async function (req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      throw new ExpressError(
        "Please include 'code', 'name', and 'description'",
        400
      );
    }
    const code = req.params.code;
    const result = await db.query(
      `UPDATE companies SET name=$1, description=$2 WHERE code = $3 RETURNING code, name, description`,
      [name, description, code]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Company code not found", 404);
    }
    return res.json({ company: result.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.delete("/:code", async function (req, res, next) {
  try {
    const code = req.params.code;
    const result = await db.query(
      `DELETE FROM companies WHERE code = $1 RETURNING code`,
      [code]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Company code not found", 404);
    }
    return res.json({ status: "deleted" });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
