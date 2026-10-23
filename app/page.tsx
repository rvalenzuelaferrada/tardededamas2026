import Voting from "@/components/voting";
import { isDemo } from "@/lib/store";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Voting demo={isDemo()} open={process.env.VOTING_OPEN !== "false"} />;
}
