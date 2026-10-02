import markdownIt from "markdown-it";

const md = markdownIt({ html: true, linkify: true });

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  eleventyConfig.addFilter("markdown", (content) => md.render(content || ""));

  eleventyConfig.addFilter("formatDate", (dateMs) => {
    if (!dateMs) return "";
    const d = new Date(Number(dateMs));
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  eleventyConfig.addFilter("formatDateShort", (dateMs) => {
    if (!dateMs) return "";
    const d = new Date(Number(dateMs));
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  });

  eleventyConfig.addFilter("isUpcoming", (dateMs) => {
    if (!dateMs) return false;
    return Number(dateMs) >= Date.now();
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
