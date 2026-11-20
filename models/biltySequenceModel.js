const db = require("../config/db");

const ensureSequenceRow = async (companyId, executor = db) => {
    await executor.execute(
        `INSERT IGNORE INTO bilty_sequences
         (company_id, prefix, next_number, pad_width)
         VALUES (?, '', 1, 5)`,
        [companyId]
    );
};

/**
 * Allocate the next bilty number for a company (race-safe inside a transaction).
 * Pass the transaction connection so reserve+insert stay atomic.
 */
const allocateNextNumber = async (companyId, executor = db) => {
    await ensureSequenceRow(companyId, executor);

    const [rows] = await executor.execute(
        `SELECT id, prefix, next_number, pad_width
         FROM bilty_sequences
         WHERE company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [companyId]
    );

    const row = rows[0];
    if (!row) {
        throw new Error("Failed to initialize bilty sequence");
    }

    const next = Number(row.next_number);
    const pad = Math.max(1, Number(row.pad_width) || 5);
    const prefix = row.prefix == null ? "" : String(row.prefix);
    const biltyNumber = `${prefix}${String(next).padStart(pad, "0")}`;

    await executor.execute(
        `UPDATE bilty_sequences
         SET next_number = ?
         WHERE id = ? AND company_id = ?`,
        [next + 1, row.id, companyId]
    );

    return biltyNumber;
};

const allocateNextNumbers = async (companyId, count, executor = db) => {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1) {
        throw new Error("count must be a positive integer");
    }
    if (n > 200) {
        throw new Error("Reserve at most 200 bilty numbers at once");
    }

    await ensureSequenceRow(companyId, executor);

    const [rows] = await executor.execute(
        `SELECT id, prefix, next_number, pad_width
         FROM bilty_sequences
         WHERE company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [companyId]
    );

    const row = rows[0];
    const start = Number(row.next_number);
    const pad = Math.max(1, Number(row.pad_width) || 5);
    const prefix = row.prefix == null ? "" : String(row.prefix);

    const numbers = [];
    for (let i = 0; i < n; i += 1) {
        numbers.push(`${prefix}${String(start + i).padStart(pad, "0")}`);
    }

    await executor.execute(
        `UPDATE bilty_sequences
         SET next_number = ?
         WHERE id = ? AND company_id = ?`,
        [start + n, row.id, companyId]
    );

    return numbers;
};

const getSequence = async (companyId, executor = db) => {
    await ensureSequenceRow(companyId, executor);
    const [rows] = await executor.execute(
        `SELECT id, company_id, prefix, next_number, pad_width, updated_at
         FROM bilty_sequences
         WHERE company_id = ?
         LIMIT 1`,
        [companyId]
    );
    return rows[0] || null;
};

const updateSequence = async (companyId, { prefix, next_number, pad_width }, executor = db) => {
    await ensureSequenceRow(companyId, executor);
    const current = await getSequence(companyId, executor);
    const nextPrefix = prefix !== undefined ? String(prefix ?? "") : current.prefix;
    const nextNum =
        next_number !== undefined ? Number(next_number) : Number(current.next_number);
    const nextPad =
        pad_width !== undefined ? Number(pad_width) : Number(current.pad_width);

    if (!Number.isInteger(nextNum) || nextNum < 1) {
        throw new Error("next_number must be an integer >= 1");
    }
    if (!Number.isInteger(nextPad) || nextPad < 1 || nextPad > 12) {
        throw new Error("pad_width must be an integer between 1 and 12");
    }

    await executor.execute(
        `UPDATE bilty_sequences
         SET prefix = ?, next_number = ?, pad_width = ?
         WHERE company_id = ?`,
        [nextPrefix, nextNum, nextPad, companyId]
    );

    return getSequence(companyId, executor);
};

module.exports = {
    ensureSequenceRow,
    allocateNextNumber,
    allocateNextNumbers,
    getSequence,
    updateSequence
};
