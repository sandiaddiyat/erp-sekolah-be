export const MIN_PASSWORD_LENGTH = 8;

/**
 * Satu-satunya kebijakan password aplikasi: minimal 8 karakter dan harus
 * mengandung huruf serta angka. Kembalikan pesan error, atau null bila valid.
 */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return "Password harus mengandung huruf dan angka.";
  }
  return null;
}
