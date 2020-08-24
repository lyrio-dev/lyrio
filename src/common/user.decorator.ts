import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * See auth/auth.middleware.ts for request.session
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.session && request.session.user;
});
