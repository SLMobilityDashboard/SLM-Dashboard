import crypto from "crypto";
import snowflake from "snowflake-sdk";

// --- Hardcoded private key as multi-line string ---
const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCviSqX+R+ltaYv
Jc4mmPDoSJVa43Rl3ObXECR6mF9eBmS0xoF0GC8MmhF0dP3iGBYUrYA+inr6uuOu
9nSw4IZjERMgmGJSJY0yZwpHSgJrvU0INXht+QAe+Fboc9i62ox6o8YKi9hzPtXV
vBIxe/xeaTs9Ph14Haz+r+cbw9UCzXtY0MyKYWJWIUdOs5U41wB6xmnk0oMLe8fQ
70cBhcira31Ad95KRurE/m1NE+YGZZlwW5O04NdtPO9k1jR3CzbcGc+abWg8YcxQ
8Dm6jELMu8jUgbwVEn3mSUGa+GvKeN8olrlhsyapAo41TzhmYRiKrwXaKHI/GwjF
KNp+apadAgMBAAECggEABHyt300hszdxvE5L1v49WD60vKpISStMpk42FIEtHObu
b5WMbRaKK1kL3a146OzjMZuexdp92sdotwn7QSM4JDOlSMXEa6OkmJd8MobQiYcA
/1b4kV0WVPRVqmL9tQcNpLvnfdEF0ypVxn0kfOnVsWcgucfK8o1VpPwDnRjUKtph
eDfnGRWGrsGt3AN2gYBC/1f/I6LnIhG3wbecHitH2H/NcixcCExAdh84yFN27tUV
NfYBQFXzVlIFhAG0CtV2NeRHTNp0Q5OOf7Hxfbt9B5XRAO2WwheXnxHMIe7UYeWg
U6WN924ogls1dTmoqcwSW7g8a/RotLz5g8EHRpsGIQKBgQDXoqY23tQ/jIoaxjoW
Yn1W9Fx/c7o122QOCyEkW5cDhWWLUZQbXWyPzloim6dlhi19h/g+1hCVEQrfbtSJ
Y5FX4nw9T3kIlWnCIi0AlXBfTa6yIULMDK/c4nOOER03ITjLbSvBUDmb1lNHZx6U
N7poBdewb1Ke/Cg613z5P0fvYQKBgQDQZO1zBZPRo4Xja7wUrQzCYRcON8ibR5J/
1AmHRWiZGHoD0ORDzIcb6L745ICE4xY3VLzY9p8aeQW7wbYEsfsRT6aibsAX+m6m
PiEPZnCLlFDPOQT+N3l65tAN9/a9gj5S4OnTIMZ0ZTy7wXNSs5AC4PkVb5ksD8RF
vLAxOUhcvQKBgAIrFYbJuNKmxCC+y4i8FsyQCnoRnNa7zQbDH+MwtJUJe1rqSBX6
W4QarBda/1TrA3wWqO1g06vcDwLuJ172TFjY4yzupqXqcrTMCS3PUuDydAZAhV5t
5jrPYCAWlfee8uZAw8be2qVxg0bdh5Yv9UTkgiW5CNimanUlA5GyDDQhAoGALZuZ
GA5FbqESIVanwAKrgzMKf7MXtVwxpMY8G53GKZNgyMsD2g6+Fw6WFRS1R+AHMa7a
8cTvxzRrW88mTdrB7uT2vB/u7JCDfOCmDZ/Gy9V25hM9k4GClbJEIHp/RrRlfW/5
3JoUtM6fPxw0aAoiX27rNJTK+gitVPHZwbweqSUCgYEAkDkr8spxNUUetnTWveac
Wyk2YDPIvOGqGkMIp4o90ugcDFPIata9TTBjoxAvRT9Oz7duuj40Uujyri4oDWWo
aiBqDrdBe32mkvfAG8xxgAfx8DS7HHYySxWBAnOt1lE2e9CcJB081JBnHIxvxXQP
CtN5P55wZfvaAUqNBem+/W4=
-----END PRIVATE KEY-----`;

const connectionConfig = {
  account: "JPCNHUS-SK19327",
  username: "USMAAN",
  warehouse: "COMPUTE_WH",
  database: "REPORT_DB",
  schema: "GPS_DASHBOARD",
  role: "SYSADMIN",
  authenticator: "SNOWFLAKE_JWT",
  privateKey: privateKeyPem, // ✅ Pass as string directly
};

export async function runQuery(query: string) {
  const connection = snowflake.createConnection(connectionConfig);

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) return reject(err);

      connection.execute({
        sqlText: query,
        complete: (execErr, stmt, rows) => {
          if (execErr) reject(execErr);
          else resolve(rows);
        },
      });
    });
  });
}
