/**
 * PROTOTYPE / SPIKE — Astro ignores `_`-prefixed pages, so /_cms is handled here.
 */
import { defineMiddleware } from "astro:middleware";
import { createCmsDispatcher } from "@cms/routes";
import { createTemplateWriteMode } from "./cms/write-mode";

const writeMode = createTemplateWriteMode();
const dispatch = createCmsDispatcher({
  writeMode,
  isDev: true,
  mount: "/_cms",
});

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (!pathname.startsWith("/_cms")) {
    return next();
  }

  const rest = pathname.slice("/_cms".length).replace(/^\//, "");
  const segments = rest.length ? rest.split("/") : [];
  return dispatch(context.request, segments);
});
