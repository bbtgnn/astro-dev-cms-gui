/**
 * Reference host factory for the Astro `/_cms` transport.
 * Required named export for createCmsIntegration({ hostModule }).
 */
export { createTemplateCmsHost as createHost } from "./write-mode";
