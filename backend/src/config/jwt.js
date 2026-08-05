module.exports = {
  secret: process.env.JWT_SECRET,
  cookieName: 'eaglevision_token',
  cookieOptions: {
    httpOnly: true,
    secure: true,               // required for sameSite: 'none'
    sameSite: 'none',           // allows cross‑site (subdomain) requests
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
};
