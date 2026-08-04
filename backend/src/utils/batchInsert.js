// Optional: use this to batch insert logs, but we are inserting directly in worker for simplicity.
async function batchInsert(rows) {
  // Could be implemented if needed
}
module.exports = { batchInsert };
