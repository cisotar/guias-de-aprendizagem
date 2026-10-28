import { App } from "@/components/App";
import { WelcomeModal } from "@/components/WelcomeModal";
import { findOpeningImage, findPublicImage } from "@/lib/openingImage";

export default function Page() {
  const basePath = process.env.PAGES_BASE_PATH ?? "";
  const openingImage = findOpeningImage(basePath);
  // Imagens padrão da guia (public/img/header.* e logo.*); o professor pode trocar ou remover.
  const defaultImages = { banner: findPublicImage("header", basePath), schoolLogo: findPublicImage("logo", basePath) };
  return (
    <>
      <App defaultImages={defaultImages} />
      {openingImage && <WelcomeModal src={openingImage} />}
    </>
  );
}
