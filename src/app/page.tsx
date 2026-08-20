import { brand } from "@/lib/brand";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
      <p className="text-lead text-muted">{brand.tagline}</p>
    </main>
  );
}
