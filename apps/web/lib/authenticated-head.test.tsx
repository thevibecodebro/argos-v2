import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Head from "../app/(authenticated)/head";

describe("authenticated head", () => {
  it("does not depend on Google Fonts for Material Symbols", () => {
    const html = renderToStaticMarkup(createElement(Head));

    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).not.toContain("fonts.gstatic.com");
  });
});
