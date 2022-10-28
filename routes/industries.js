const express = require("express");
const ExpressError = require("../expressError");
const router = new express.Router();
const db = require("../db");

router.get("/", async function (req, res, next) {
  try {
    const result = await db.query(
      "SELECT i.code, i.industry, c.code AS company FROM industries AS i LEFT JOIN companies_industries AS ci ON i.code = ci.ind_code LEFT JOIN companies AS c ON ci.comp_code=c.code ORDER BY i.code"
    );
    const industries = [];
    const indList = [];
    for (let row of result.rows) {
      indList.push(row.code);
    }
    const indSet = new Set(indList);
    for (let code of indSet) {
      const industry = { code };
      const companies = [];
      for (let row of result.rows) {
        if (row.code === code) {
          companies.push(row.company);
          industry.industry = row.industry;
        }
      }
      industry.companies = companies;
      industries.push(industry);
    }
    return res.json({ industries });
  } catch (e) {
    return next(e);
  }
});

router.post("/", async function (req, res, next) {
  try {
    const { code, industry } = req.body;
    if (!code || !industry) {
      throw new ExpressError("Please include 'code' and 'industry'", 400);
    }
    const result = await db.query(
      `INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING code, industry`,
      [code, industry]
    );
    return res.status(201).json({ industry: result.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.post("/:code/companies", async function (req, res, next) {
  try {
    const ind_code = req.params.code;
    const { comp_code } = req.body;
    if (!comp_code) {
      throw new ExpressError("Please include 'comp_code'", 400);
    }
    const result = await db.query(
      `INSERT INTO companies_industries (comp_code, ind_code) VALUES ($1, $2) RETURNING comp_code, ind_code`,
      [comp_code, ind_code]
    );
    return res.status(201).json({ created: result.rows[0] });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
