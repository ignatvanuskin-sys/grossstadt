import Image from "next/image";
import { assetBySrc } from "@/lib/images";

type FillImageProps = {
  src: string;
  alt: string;
  /** Responsive sizes attribute — always pass one to keep the payload small. */
  sizes: string;
  priority?: boolean;
  /** "cover" fills the frame, "contain" shows the whole image with letterboxing. */
  fit?: "cover" | "contain";
  /** Fraction of the frame to keep in view when cropping, e.g. "50% 30%". */
  position?: string;
  quality?: number;
};
/**
 * The only image primitive on the site. It always uses the intrinsic size from
 * content/images.json, always ships a blurred placeholder and never upscales.
 * It fills whatever positioned element it is placed in, so the surrounding
 * layout owns the aspect ratio and nothing can shift.
 *
 * Everything except the hero is `fetchPriority="low"`: the frames below the
 * first screen are lazy, so they must not compete with the text and the hero
 * image for the bandwidth that decides when the page first looks finished.
 */
export function FillImage({
  src,
  alt,
  sizes,
  priority = false,
  fit,
  position = "50% 50%",
  quality = 82,
}: FillImageProps) {
  const asset = assetBySrc(src);
  const objectFit = fit ?? asset.fit;

  return (
    <Image
      src={asset.src}
      alt={alt}
      fill
      sizes={sizes}
      quality={quality}
      priority={priority}
      fetchPriority={priority ? "high" : "low"}
      placeholder="blur"
      blurDataURL={asset.blurDataURL}
      style={{ objectFit, objectPosition: position }}
    />
  );
}

export type FigureProps = FillImageProps & {
  className?: string;
  /** Override the natural aspect ratio of the frame (width / height). */
  aspect?: number;
  dark?: boolean;
};

/** A framed image: the frame reserves the exact space, the image fills it. */
export function Figure({
  className = "",
  aspect,
  dark = false,
  ...image
}: FigureProps) {
  const asset = assetBySrc(image.src);

  return (
    <div
      className={`frame relative ${dark ? "bg-night-2" : ""} ${className}`}
      style={{ aspectRatio: aspect ?? asset.aspect }}
    >
      <FillImage {...image} />
    </div>
  );
}

/** «Визуализация» / «Реализация» — never lets a render pass as a built object. */
export function KindBadge({
  kind,
  className = "",
  tone = "light",
}: {
  kind: "render" | "photo";
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans text-micro uppercase ${
        tone === "dark" ? "text-[#D9BC85]" : "text-brass"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`inline-block h-[6px] w-[6px] rotate-45 ${
          tone === "dark" ? "bg-[#D9BC85]" : "bg-brass"
        }`}
      />
      {kind === "render" ? "Визуализация" : "Реализация"}
    </span>
  );
}
