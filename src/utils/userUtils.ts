/**
 * Gets the initials from a user object
 * @param user - User object containing first_name, last_name, and/or username
 * @returns User initials as a string (e.g., "JD" for John Doe)
 */
export const getUserInitials = (user: { first_name?: string; last_name?: string; username?: string } | null): string => {
  if (!user) return 'U';
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const username = user.username || '';
  
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  } else if (firstName) {
    return firstName.charAt(0).toUpperCase();
  } else if (lastName) {
    return lastName.charAt(0).toUpperCase();
  } else if (username) {
    return username.charAt(0).toUpperCase();
  }
  
  return 'U';
};