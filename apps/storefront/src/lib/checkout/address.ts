const MOLDOVA_POSTAL_CODE_PATTERN = /^(?:MD[\s-]?)?\d{4}$/i;

export function isValidMoldovaPostalCode(value: string): boolean {
  return MOLDOVA_POSTAL_CODE_PATTERN.test(value.trim());
}
