export const config = {
  baseUrl: "https://api.kucoin.com",
  apiAuth: {
    key: process.env.API_KEY, // KC-API-KEY
    secret: process.env.SECRET, // API-Secret
    passphrase: process.env.API_PASS, // KC-API-PASSPHRASE
  },
  authVersion: 2, // KC-API-KEY-VERSION. Notice: for v2 API-KEY, not required for v1 version.
};
