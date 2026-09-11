export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)"],
};
