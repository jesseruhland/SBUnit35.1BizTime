const express = require("express");
const ExpressError = require("../expressError");
const router = new express.Router();
const db = require("../db");

router.get("/", async function (req, res, next) {
  try {
    const results = await db.query("SELECT id, comp_code FROM invoices");
    return res.json({ invoices: results.rows });
  } catch (e) {
    return next(e);
  }
});

router.get("/:id", async function (req, res, next) {
  try {
    const invID = req.params.id;
    const result = await db.query(
      "SELECT id, amt, paid, add_date, paid_date, code, name, description FROM invoices JOIN companies ON invoices.comp_code = companies.code WHERE id=$1",
      [invID]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Invoice id not found", 404);
    }
    const { id, amt, paid, add_date, paid_date, code, name, description } =
      result.rows[0];
    return res.json({
      invoice: {
        id: id,
        amt: amt,
        paid: paid,
        add_date: add_date,
        paid_date: paid_date,
        company: { code: code, name: name, description: description },
      },
    });
  } catch (e) {
    return next(e);
  }
});

router.post("/", async function (req, res, next) {
  try {
    const { comp_code, amt } = req.body;
    if (!comp_code || !amt) {
      throw new ExpressError("Please include 'comp_code' and 'amt'", 400);
    }
    const result = await db.query(
      `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [comp_code, amt]
    );
    return res.status(201).json({ invoice: result.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.put("/:id", async function (req, res, next) {
  try {
    const { amt, paid } = req.body;
    if (!amt || paid === undefined) {
      throw new ExpressError(
        "Please include 'amt' and 'paid'; amt cannot equal 0",
        400
      );
    }
    const id = req.params.id;
    const invRes = await db.query(
      `SELECT id, comp_code, amt, paid, add_date, paid_date FROM invoices WHERE id = $1`,
      [id]
    );
    if (invRes.rows.length === 0) {
      throw new ExpressError("Invoice id not found", 404);
    }
    let result;
    if (invRes.rows[0].paid === true && paid === true) {
      result = await db.query(
        `UPDATE invoices SET amt=$1 WHERE id = $2 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        [amt, id]
      );
    }
    if (invRes.rows[0].paid === false && paid === true) {
      const paid_date = new Date();
      result = await db.query(
        `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3 WHERE id = $4 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        [amt, paid, paid_date, id]
      );
    }
    if (invRes.rows[0].paid === true && paid === false) {
      const paid_date = null;
      result = await db.query(
        `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3 WHERE id = $4 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        [amt, paid, paid_date, id]
      );
    }
    if (invRes.rows[0].paid === false && paid === false) {
      result = await db.query(
        `UPDATE invoices SET amt=$1 WHERE id = $2 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        [amt, id]
      );
    }
    return res.json({ invoice: result.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    const id = req.params.id;
    const result = await db.query(
      `DELETE FROM invoices WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      throw new ExpressError("Invoice id not found", 404);
    }
    return res.json({ status: "deleted" });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
