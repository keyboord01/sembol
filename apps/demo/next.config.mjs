/** @type {import('next').NextConfig} */
const nextConfig = {
  // smart-account-kit ships extensionless relative ESM imports; let Next
  // transpile/resolve it bundler-style on the server too.
  transpilePackages: ["smart-account-kit"],
};

export default nextConfig;
