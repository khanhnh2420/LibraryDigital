// utils/hash.js
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

export async function hashPasswordWithSignature(password) {
  const signature = process.env.SECRET_SIGNATURE;
  const passwordWithSignature = password + signature;
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(passwordWithSignature, salt);
}

export async function comparePasswordWithSignature(password, hash) {
  const signature = process.env.SECRET_SIGNATURE;
  const passwordWithSignature = password + signature;
  return await bcrypt.compare(passwordWithSignature, hash);
}
