import { getInitialSeedData, buildClientSnapshot } from "@/lib/client-store";
import { MobillsApp } from "@/components/MobillsApp";

export default function HomePage() {
  const defaultSnapshot = buildClientSnapshot(getInitialSeedData(), 10, 2026);
  return <MobillsApp initialData={defaultSnapshot} />;
}
