import { cookies } from "next/headers";
import {
  getDefaultUser,
  getUserById,
  getFinancialSnapshot,
} from "@/lib/finance-engine";
import { MobillsApp } from "@/components/MobillsApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const uidCookie = cookieStore.get("mobills_session_uid")?.value;
  const user = (uidCookie && getUserById(uidCookie)) || getDefaultUser();
  const snapshot = getFinancialSnapshot(user.id, 10, 2026);

  return <MobillsApp initialData={snapshot} />;
}
