import React from 'react';
import { Helmet } from 'react-helmet-async';

const siteBase =
  typeof process.env.REACT_APP_SITE_URL === 'string' && process.env.REACT_APP_SITE_URL.length > 0
    ? process.env.REACT_APP_SITE_URL.replace(/\/$/, '')
    : '';

export type SeoProps = {
  title: string;
  description?: string;
  /** Путь от корня сайта, например `/recipe/3` */
  canonicalPath?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
};

export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  canonicalPath,
  noindex,
  ogImage,
  ogType = 'website',
  jsonLd,
}) => {
  const fullTitle = title.includes('MixMaster') ? title : `${title} | MixMaster`;
  const canonical =
    siteBase && canonicalPath
      ? `${siteBase}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
      : undefined;

  return (
    <Helmet prioritizeSeoTags>
      <html lang="ru" />
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      <meta property="og:title" content={fullTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      <meta property="og:type" content={ogType} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
};
