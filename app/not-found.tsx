import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-ink px-5 text-center text-ivory"><div><p className="eyebrow justify-center">404 · Empty frame</p><h1 className="mt-5 font-serif text-6xl">This artwork moved.</h1><p className="mt-4 text-white/45">Return to the gallery and find another feeling.</p><Link href="/" className="button-light mt-7">Back to Giggle Gallery</Link></div></main>;
}
