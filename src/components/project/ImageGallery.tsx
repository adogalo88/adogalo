"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

interface ImageGalleryProps {
  images: string[];
  maxThumbnails?: number;
}

export default function ImageGallery({
  images,
  maxThumbnails = 4,
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const displayImages = images.slice(0, maxThumbnails);
  const remainingCount = images.length - maxThumbnails;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {displayImages.map((image, index) => (
          <div
            key={index}
            className="relative cursor-pointer group"
            onClick={() => openLightbox(index)}
          >
            <img
              src={image}
              alt={`Image ${index + 1}`}
              className="w-20 h-20 object-cover rounded-lg border border-white/10 transition-transform group-hover:scale-105"
            />
            {index === maxThumbnails - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                <span className="text-white font-medium">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
