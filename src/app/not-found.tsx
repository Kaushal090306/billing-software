import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-4">Could not find requested resource</p>
      <Link href="/" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
        Return Home
      </Link>
    </div>
  );
}

