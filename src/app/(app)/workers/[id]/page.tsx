import { buildSeed } from "@/lib/demo-data";
import { WorkerDetail } from "./worker-detail";

// Pre-render every demo worker so the app can be served as a static site.
export function generateStaticParams() {
  return buildSeed(0).workers.map((w) => ({ id: w.id }));
}

export default function Page() {
  return <WorkerDetail />;
}
