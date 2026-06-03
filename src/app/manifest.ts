import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cene struje · Srbija',
    short_name: 'Cene struje',
    description: 'Sutrašnje cene električne energije za Srbiju — SEEPEX day-ahead i CBC (BA→RS)',
    start_url: '/',
    display: 'standalone',
    background_color: '#080c14',
    theme_color: '#f59e0b',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
