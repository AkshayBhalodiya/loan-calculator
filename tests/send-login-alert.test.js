const { sendNewDeviceLoginAlert } = require('../src/lib/emailService');

async function run() {
  try {
    const result = await sendNewDeviceLoginAlert(
      process.env.TEST_EMAIL,
      'Chrome on Windows 11',
      '203.0.113.42',
      new Date(),
      'Mumbai, India'
    );

    console.log('Login alert email sent:', result);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send login alert email:', err);
    process.exit(1);
  }
}

run();
