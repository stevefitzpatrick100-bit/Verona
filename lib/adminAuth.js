// Admin passwords. ADMIN_PASSWORD is the main one; ADMIN_PASSWORD_2 is an
// extra password for partners. Either one opens Mission Control.
export function isAdminPassword(value) {
  if (!value) return false;
  return [process.env.ADMIN_PASSWORD, process.env.ADMIN_PASSWORD_2]
    .filter(Boolean)
    .includes(value);
}
