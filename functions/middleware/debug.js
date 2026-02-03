// server/middleware/debug.js
const debug = (req, res, next) => {
    console.log('\n===== Request Debug =====');
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    console.log('=========================\n');
    next();
  };
  
  module.exports = debug;