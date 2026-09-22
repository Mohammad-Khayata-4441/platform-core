/**
 * Represents the authenticated user attached to every request by JwtAuthGuard.
 * Injected via @CurrentUser() in controllers.
 */
export class RequestUser {
  id: string = '';
  tenantId: string = '';
  email: string = '';
}
