// Keeps a collection bounded by deleting the oldest documents beyond `limit`
// for a given filter, so history/audit collections don't grow unbounded.
async function trimOldest(Model, filter, limit) {
  const excess = await Model.find(filter).sort({ createdAt: -1 }).skip(limit).select('_id').lean();
  if (excess.length > 0) {
    await Model.deleteMany({ _id: { $in: excess.map((d) => d._id) } });
  }
}

module.exports = { trimOldest };
