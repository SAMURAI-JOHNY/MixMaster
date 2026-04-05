import React, { useEffect, useState } from 'react';
import { uploadAPI } from '../../api/upload';

type ResolvedImageProps = {
  storageUrl: string | null | undefined;
  alt: string;
  className?: string;
  fallbackSrc: string;
};

/** Прямой или pre-signed URL для s3:// */
export const ResolvedImage: React.FC<ResolvedImageProps> = ({
  storageUrl,
  alt,
  className,
  fallbackSrc,
}) => {
  const [resolved, setResolved] = useState<string | null>(() =>
    uploadAPI.getImageUrl(storageUrl ?? null),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const sync = uploadAPI.getImageUrl(storageUrl ?? null);
    if (sync) {
      setResolved(sync);
      return;
    }
    if (!storageUrl) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    uploadAPI.resolveDisplayUrl(storageUrl).then((url) => {
      if (!cancelled) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [storageUrl]);

  const src = !storageUrl ? fallbackSrc : failed || !resolved ? fallbackSrc : resolved;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};
