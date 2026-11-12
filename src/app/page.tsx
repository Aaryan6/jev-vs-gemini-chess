import { Arena } from "@/components/Arena";
import { MODELS } from "@/lib/players";

export default function Home() {
  return (
    <main className="flex-1">
      <Arena models={MODELS} />
    </main>
  );
}
