import Link from "next/link";

type Role = "BUYER" | "SELLER" | "ADMIN";

export function PrimaryNavigation({
  signedIn,
  role,
  showAuctions,
  className = "",
}: {
  signedIn: boolean;
  role?: Role;
  showAuctions: boolean;
  className?: string;
}) {
  return (
    <nav
      className={`flex items-center gap-5 overflow-x-auto whitespace-nowrap text-sm text-white/65 ${className}`}
      aria-label="Primary navigation"
    >
      <Link href="/" className="hover:text-white">Home</Link>
      <Link href="/#gallery" className="hover:text-white">Gallery</Link>
      {showAuctions && <Link href="/auctions" className="hover:text-white">Auctions</Link>}
      <Link href="/#artists" className="hover:text-white">Artists</Link>
      {signedIn ? (
        <>
          <Link href="/following" className="hover:text-white">Following</Link>
          <Link href="/collections" className="hover:text-white">Collections</Link>
          <Link href="/orders" className="hover:text-white">Orders</Link>
          <Link href="/notifications" className="hover:text-white">Notifications</Link>
          <Link href="/account" className="hover:text-white">Account</Link>
          {role === "SELLER" && <Link href="/seller" className="hover:text-white">Seller</Link>}
          {role === "ADMIN" && <Link href="/admin" className="hover:text-white">Admin</Link>}
        </>
      ) : (
        <Link href="/sign-in" className="hover:text-white">Sign in</Link>
      )}
    </nav>
  );
}
