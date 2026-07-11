import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const keyLength = 64;
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;

function deriveKey(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, rawCost, rawBlockSize, rawParallelization, rawSalt, rawHash] =
    encodedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    !rawCost ||
    !rawBlockSize ||
    !rawParallelization ||
    !rawSalt ||
    !rawHash
  ) {
    return false;
  }

  const expected = Buffer.from(rawHash, "base64url");

  try {
    const actual = await deriveKey(
      password,
      Buffer.from(rawSalt, "base64url"),
      expected.length,
      {
        N: Number(rawCost),
        r: Number(rawBlockSize),
        p: Number(rawParallelization),
      },
    );

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
