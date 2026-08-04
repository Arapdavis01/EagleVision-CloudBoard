module.exports = {
  secret: process.env.JWT_SECRET,
  cookieName: 'eaglevision_token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  },
};
