// Placeholder if you want a standalone ping function
module.exports = async (url) => {
  const axios = require('axios');
  const start = Date.now();
  try {
    const res = await axios.get(url, { timeout: 10000, validateStatus: () => true });
    return { statusCode: res.status, responseTime: Date.now() - start, isUp: res.status < 400 };
  } catch {
    return { statusCode: null, responseTime: Date.now() - start, isUp: false };
  }
};
