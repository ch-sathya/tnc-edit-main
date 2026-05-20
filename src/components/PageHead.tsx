import React from 'react';
import { Helmet } from 'react-helmet-async';

interface PageHeadProps {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}

const SITE = 'The Night Club';
const ORIGIN = 'https://the-night-club.lovable.app';

export const PageHead: React.FC<PageHeadProps> = ({ title, description, path, noIndex }) => {
  const fullTitle = title.includes(SITE) ? title : `${title} — ${SITE}`;
  const url = path ? `${ORIGIN}${path}` : ORIGIN;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
};

export default PageHead;
