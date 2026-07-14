const crypto = require('crypto');

function generateDeviceId() {
  return crypto.randomBytes(16).toString('hex');
}

function setDeviceIdCookie(res, deviceId) {
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  res.cookie('deviceId', deviceId, {
    maxAge: oneYear,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
}

function getDeviceId(req) {
  return req.cookies.deviceId;
}

function getOrCreateDeviceId(req, res) {
  let deviceId = getDeviceId(req);

  console.log('Device ID:', deviceId);

  if (!deviceId) {
    deviceId = generateDeviceId();
    setDeviceIdCookie(res, deviceId);
    console.log('Generated new Device ID:', deviceId);
  }

  return deviceId;
}

module.exports = {
  generateDeviceId,
  setDeviceIdCookie,
  getDeviceId,
  getOrCreateDeviceId,
};
