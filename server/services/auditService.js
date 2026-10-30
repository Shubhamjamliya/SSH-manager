const AuditLog = require('../models/AuditLog');
const { trimOldest } = require('../utils/trimHistory');

const AUDIT_LOG_LIMIT_PER_USER = 300;

async function logAudit({ user, server, action, detail }) {
  await AuditLog.create({ user, server, action, detail });
  await trimOldest(AuditLog, { user }, AUDIT_LOG_LIMIT_PER_USER);
}

module.exports = { logAudit, AUDIT_LOG_LIMIT_PER_USER };
