// A testing account is an admin internally this is needed to forward the emails to the testing account
// instead of triggering the full distribution list
export function effectiveRole(user) {
  if (user?.role === 'testing') return 'admin'
  return user?.role
}

export function isAdmin(user) {
  return effectiveRole(user) === 'admin'
}

export function hasRole(user, ...roles) {
  return roles.includes(effectiveRole(user))
}
