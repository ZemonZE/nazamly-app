/**
 * Global Logger Middleware (Modular)
 * Intercepts all requests and responses for deep debugging, including Multer file uploads.
 */

const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toLocaleString();

  // 1. Capture the original response methods to intercept the status and body if needed
  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody;

  res.json = function (body) {
    responseBody = body;
    return originalJson.apply(res, arguments);
  };

  res.send = function (body) {
    responseBody = body;
    return originalSend.apply(res, arguments);
  };

  // 2. Listen for the 'finish' event to log after the request has been processed
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, headers, query, body: reqBody, file, files } = req;
    const { statusCode } = res;

    // 🔒 Security: Mask sensitive information
    const maskedHeaders = { ...headers };
    if (maskedHeaders.authorization) maskedHeaders.authorization = 'Bearer ********';
    if (maskedHeaders['x-auth-token']) maskedHeaders['x-auth-token'] = '********';
    
    const maskedBody = reqBody ? { ...reqBody } : {};
    if (maskedBody.password) maskedBody.password = '********';
    if (maskedBody.token) maskedBody.token = '********';

    console.log(`\n============== [${timestamp}] ==============`);
    console.log(`🚀 REQUEST: ${method} ${originalUrl}`);
    console.log(`   Headers:`, JSON.stringify(maskedHeaders, null, 2));
    console.log(`   Query:  `, JSON.stringify(query, null, 2));
    console.log(`   Body:   `, JSON.stringify(maskedBody, null, 2));
    
    // 📁 File Uploads (Multer Debugging)
    if (file) {
      console.log(`   📦 File:   `, JSON.stringify({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        path: file.path
      }, null, 2));
    }
    if (files && Array.isArray(files) && files.length > 0) {
      console.log(`   📦 Files (${files.length}):`, JSON.stringify(files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        size: `${(f.size / 1024).toFixed(2)} KB`
      })), null, 2));
    }

    console.log(`\n✅ RESPONSE: Status ${statusCode} (${duration}ms)`);
    
    // Log response body safely
    try {
      if (responseBody) {
        if (typeof responseBody === 'string') {
          try {
            const parsed = JSON.parse(responseBody);
            console.log(`   Body:   `, JSON.stringify(parsed, null, 2));
          } catch {
            console.log(`   Body:   `, responseBody.length > 500 ? responseBody.substring(0, 500) + "..." : responseBody);
          }
        } else {
          console.log(`   Body:   `, JSON.stringify(responseBody, null, 2));
        }
      }
    } catch (e) {
      console.log(`   Body:   `, "[Unreadable Body]");
    }
    console.log(`============================================\n`);
  });

  next();
};

module.exports = loggerMiddleware;
