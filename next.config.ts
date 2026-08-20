import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "www.themoviedb.org", pathname: "/assets/v4/logos/**" },
    ],
  },
};

export default nextConfig;
