/** 静的エクスポート（Cloudflare Pages にそのまま配置できる形） */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
