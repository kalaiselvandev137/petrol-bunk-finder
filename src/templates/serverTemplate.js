export const getServerTemplate = () => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Status</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px 60px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .status-icon {
          font-size: 60px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          font-size: 24px;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .status {
          display: inline-block;
          padding: 8px 20px;
          background: #10b981;
          color: white;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        }
        .info {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          color: #666;
          font-size: 14px;
        }
        .info-item strong {
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="status-icon">✅</div>
        <h1>${process.env.SERVER_NAME || ''}</h1>
        <p>Server is running successfully</p>
        <span class="status">ONLINE</span>
        
        <div class="info">
          <div class="info-item">
            <span>Status:</span>
            <strong>Active</strong>
          </div>
          <div class="info-item">
            <span>Environment:</span>
            <strong>${process.env.NODE_ENV || ''}</strong>
          </div>
          <div class="info-item">
            <span>Time:</span>
            <strong>${new Date().toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};