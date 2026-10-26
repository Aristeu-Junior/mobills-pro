/** @type {import('next').NextConfig} */
const isExport = Boolean(process.env.NEXT_EXPORT || process.env.GITHUB_ACTIONS);

const nextConfig = {
  ...(isExport
    ? {
        output: 'export',
        basePath: process.env.GITHUB_ACTIONS ? '/mobills-pro' : undefined,
        images: { unoptimized: true },
      }
    : {
        serverExternalPackages: ['node:sqlite'],
      }),
};

export default nextConfig;
