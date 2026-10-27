import { App } from "@/components/App";
import { WelcomeModal } from "@/components/WelcomeModal";
import { findOpeningImage } from "@/lib/openingImage";

export default function Page() {
  const openingImage = findOpeningImage(process.env.PAGES_BASE_PATH ?? "");
  return (
    <>
      <App />
      {openingImage && <WelcomeModal src={openingImage} />}
    </>
  );
}
