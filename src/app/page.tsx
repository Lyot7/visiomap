"use client";
import Map from "@/components/Map";

export default function Home() {

  return (
    <main className="flex min-h-screen flex-row items-center justify-between px-24 py-12 gap-8 h-screen">
      <Map />
      <section>
        <h1 className="text-3xl font-bold">Trouvez vos collègues et lancez une visio</h1>
      </section>
    </main>
  );
}
