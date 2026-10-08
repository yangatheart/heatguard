import { buildSeed } from "@/lib/demo-data";
import { TaskDetail } from "./task-detail";

export function generateStaticParams() {
  return buildSeed(0).tasks.map((t) => ({ id: t.id }));
}

export default function Page() {
  return <TaskDetail />;
}
