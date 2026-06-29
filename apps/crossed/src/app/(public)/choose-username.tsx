import { useRouter } from "expo-router";
import { ChooseUsernameView } from "../../components/ChooseUsernameView";

// Real new-user route (logged-out). The preview walkthrough renders the same
// ChooseUsernameView inside /intro-preview (a non-public route the auth guard
// allows for an existing account).
export default function ChooseUsername() {
  const router = useRouter();
  return <ChooseUsernameView onBack={router.back} />;
}
