import {
  ogImageAlt,
  ogImageContentType,
  ogImageSize,
  renderOgImage,
} from "@/components/brand/og-image";

export const alt = ogImageAlt;
export const contentType = ogImageContentType;
export const size = ogImageSize;

export default function Image() {
  return renderOgImage();
}
