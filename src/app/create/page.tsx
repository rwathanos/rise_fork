import { ConnectGuard } from "@/components/ConnectGuard";
import { CreateTokenForm } from "@/components/CreateTokenForm";

export default function CreatePage() {
  return (
    <ConnectGuard>
      <CreateTokenForm />
    </ConnectGuard>
  );
}
