/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The SQLite credential store is read at runtime via an fs path, which Next's
  // file tracing cannot detect. Bundle it into the login serverless function.
  outputFileTracingIncludes: {
    "/api/portal/login": ["./data/wahrden.sqlite"]
  }
};
export default nextConfig;
