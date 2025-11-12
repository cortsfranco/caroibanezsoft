import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

export const AVATAR_DIR = path.join(process.cwd(), "attached_assets", "patient_avatars");

/**
 * Saves uploaded avatar file and returns the URL path
 * @param file - Multer file object
 * @param patientId - Patient ID for filename generation
 * @returns Relative URL path to the saved avatar
 */
export async function saveAvatar(file: Express.Multer.File, patientId: string): Promise<string> {
  // Ensure avatars directory exists
  await fs.mkdir(AVATAR_DIR, { recursive: true });
  
  // Generate safe filename: patientId-timestamp-uuid.ext
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${patientId}-${Date.now()}-${randomUUID()}${ext}`;
  const filepath = path.join(AVATAR_DIR, filename);
  
  // Security: verify path is within avatar directory (prevent path traversal)
  const resolvedPath = path.resolve(filepath);
  if (!resolvedPath.startsWith(path.resolve(AVATAR_DIR))) {
    throw new Error("Invalid file path");
  }
  
  // Move uploaded file to avatars directory
  await fs.rename(file.path, filepath);
  
  // Return relative URL for database storage
  return `/assets/patient_avatars/${filename}`;
}

/**
 * Deletes avatar file from filesystem
 * @param avatarUrl - Avatar URL path stored in database
 */
export async function deleteAvatar(avatarUrl: string | null): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith("/assets/patient_avatars/")) {
    return;
  }
  
  const filename = path.basename(avatarUrl);
  const filepath = path.join(AVATAR_DIR, filename);
  
  // Security: verify path is within avatar directory (prevent path traversal)
  const resolvedPath = path.resolve(filepath);
  if (!resolvedPath.startsWith(path.resolve(AVATAR_DIR))) {
    return;
  }
  
  try {
    await fs.unlink(filepath);
  } catch (error) {
    // Ignore if file doesn't exist
    console.warn(`Failed to delete avatar: ${avatarUrl}`, error);
  }
}
