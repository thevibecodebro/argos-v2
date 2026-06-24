const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const PATH_SEPARATOR_PATTERN = /[\\/]/;

export function isSafeStorageFileName(fileName: string) {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed === "." || trimmed === "..") {
    return false;
  }

  if (PATH_SEPARATOR_PATTERN.test(fileName)) {
    return false;
  }

  return !CONTROL_CHARACTER_PATTERN.test(fileName);
}

export function assertSafeStorageFileName(fileName: string) {
  if (!isSafeStorageFileName(fileName)) {
    throw new Error("Invalid recording filename.");
  }

  return fileName;
}
