const APPROVED_STATUS = "approved";

/**
 * Returns redirect path after login based on profile status.
 */
export function getPostLoginRedirect(status: string | null | undefined): string {
  return status === APPROVED_STATUS ? "/events" : "/pending";
}
