const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from TNG Finhack 20 Deployment Test! The CI/CD pipeline works!');
});

// Health check endpoint required by the Dockerfile configuration
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
