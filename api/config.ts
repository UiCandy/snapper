import dotenv from "dotenv";
dotenv.config();

export const config = {
  baseUrl: "https://api.kucoin.com",
  apiAuth: {
    key: process.env.API_KEY, // KC-API-KEY
    secret: process.env.API_SECRET, // API-Secret
    passphrase: process.env.API_PASS, // KC-API-PASSPHRASE
  },
  authVersion: 2, // KC-API-KEY-VERSION. Notice: for v2 API-KEY, not required for v1 version.
};

export const dbConfig = {
  apiKey: process.env.APIKEY,
  authDomain: process.env.AUTHDOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGINGSENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID,
};

export const cmcToken = process.env.CMC_KEY;
