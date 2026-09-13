import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['./data/**/*'],
  },
  async redirects() {
    return [
      {
        source: '/students',
        destination: '/student',
        permanent: true,
      },
      {
        source: '/students/:path*',
        destination: '/student/:path*',
        permanent: true,
      },
      {
        source: '/mentors',
        destination: '/mentor',
        permanent: true,
      },
      {
        source: '/mentors/:path*',
        destination: '/mentor/:path*',
        permanent: true,
      },
      {
        source: '/judges',
        destination: '/judge',
        permanent: true,
      },
      {
        source: '/judges/:path*',
        destination: '/judge/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
