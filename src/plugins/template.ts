/**
 * @module
 * Template plugin for sently.
 * Renders HTML email templates using a pluggable engine.
 * Built-in: simple {{variable}} interpolation (zero dependencies).
 * Bring your own engine: pass any render function.
 *
 * @example
 * ```ts
 * import { templatePlugin, simpleEngine } from 'sently/plugins/template'
 *
 * const mailer = await createMailer({
 *   transport: new ResendTransport({ apiKey }),
 *   plugins: [
 *     templatePlugin({
 *       engine: simpleEngine,
 *       templates: {
 *         welcome: '<h1>Hello, {{name}}!</h1>',
 *         reset:   '<p>Reset link: {{link}}</p>',
 *       },
 *     }),
 *   ],
 * })
 *
 * await mailer.send({
 *   from: '...',
 *   to: '...',
 *   subject: 'Welcome!',
 *   template: 'welcome',
 *   data: { name: 'Ali' },
 * })
 * ```
 */
import type { MailOptions, MailPlugin } from "../core/types.js";

/** Renders a template string with the given data object. */
export type TemplateEngine = (template: string, data: Record<string, unknown>) => string;

/** Configuration for the template plugin. */
export interface TemplatePluginConfig {
  /**
   * Rendering function. Use `simpleEngine` for zero-dep {{var}} interpolation,
   * or pass any function: (template, data) => string.
   */
  engine: TemplateEngine;
  /**
   * Map of template names to HTML strings.
   * Templates are loaded once at plugin creation time.
   */
  templates: Record<string, string>;
}

/**
 * Built-in zero-dependency template engine.
 * Replaces {{variable}} with the matching value from data.
 * Unknown variables are replaced with an empty string.
 */
export function simpleEngine(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

/**
 * Create a template plugin from the given config.
 * The plugin reads options.template and options.data, renders the HTML,
 * sets options.html, and removes template/data before passing to the next plugin.
 */
export function templatePlugin(config: TemplatePluginConfig): MailPlugin {
  return (options: MailOptions): MailOptions => {
    if (!options.template) {
      return options;
    }

    const tmpl = config.templates[options.template];
    if (!tmpl) {
      throw new Error(`sently: template "${options.template}" not found`);
    }

    const html = config.engine(tmpl, options.data ?? {});
    const { template: _template, data: _data, ...rest } = options;
    return { ...rest, html };
  };
}
