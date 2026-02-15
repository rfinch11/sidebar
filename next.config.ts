import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "react-markdown",
    "remark-parse",
    "remark-rehype",
    "unified",
    "unist-util-visit",
    "mdast-util-to-hast",
    "micromark",
  ],
};

export default nextConfig;
