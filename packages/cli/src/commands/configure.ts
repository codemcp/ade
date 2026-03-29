import * as clack from "@clack/prompts";
import {
  type LogicalConfig,
  type PermissionPolicy,
  readLockFile,
  getDefaultCatalog,
  getFacet
} from "@codemcp/ade-core";
import {
  type HarnessWriter,
  allHarnessWriters,
  getHarnessWriter,
  detectHarnesses,
  installSkills,
  writeInlineSkills
} from "@codemcp/ade-harnesses";
import { installKnowledge } from "../knowledge-installer.js";

/**
 * `ade configure` — ephemeral harness configuration.
 *
 * Loads the existing lock file (requires `ade setup` to have been run), then
 * prompts for harness-specific settings: autonomy profile, target harnesses,
 * skills installation, and knowledge source initialisation.
 *
 * Nothing is written to config.yaml or config.lock.yaml — the configuration
 * is intentionally ephemeral so that developer-level preferences (autonomy,
 * harness choice) stay separate from the team-level development choices.
 */
export async function runConfigure(
  projectRoot: string,
  harnessWriters: HarnessWriter[] = allHarnessWriters
): Promise<void> {
  clack.intro("ade configure");

  const lockFile = await readLockFile(projectRoot);
  if (!lockFile) {
    clack.log.error(
      "config.lock.yaml not found. Run `ade setup` first to initialise the project."
    );
    clack.outro("Configure aborted.");
    return;
  }

  // ── Autonomy prompt ────────────────────────────────────────────────────────
  const catalog = getDefaultCatalog();
  const autonomyFacet = getFacet(catalog, "autonomy");

  let permissionPolicy: PermissionPolicy | undefined;

  if (autonomyFacet) {
    const autonomyOptions = autonomyFacet.options.map((o) => ({
      value: o.id,
      label: o.label,
      hint: o.description
    }));
    autonomyOptions.push({ value: "__skip__", label: "Skip", hint: "" });

    const selected = await clack.select({
      message: `${autonomyFacet.label} — ${autonomyFacet.description}`,
      options: autonomyOptions
    });

    if (typeof selected === "symbol") {
      clack.cancel("Configure cancelled.");
      return;
    }

    if (typeof selected === "string" && selected !== "__skip__") {
      permissionPolicy = { profile: selected } as PermissionPolicy;
    }
  }

  // ── Harness selection ──────────────────────────────────────────────────────
  const harnessOptions = harnessWriters.map((w) => ({
    value: w.id,
    label: w.label,
    hint: w.verified
      ? w.description
      : `${w.description} · unverified — config generation may be inaccurate`
  }));

  const initialHarnesses = await detectHarnesses(projectRoot, harnessWriters);

  const selectedHarnesses = await clack.multiselect({
    message:
      "Which coding agents should receive this configuration?\n" +
      "ADE generates config files for each agent you select.\n",
    options: harnessOptions,
    initialValues: initialHarnesses,
    required: false
  });

  if (typeof selectedHarnesses === "symbol") {
    clack.cancel("Configure cancelled.");
    return;
  }

  const harnesses = selectedHarnesses as string[];

  // ── Build ephemeral logical config ─────────────────────────────────────────
  // Merge the chosen permission policy on top of the locked logical config.
  // The base locked config already contains instructions, MCP servers, skills,
  // etc. — we only override (or add) the permission_policy here.
  const logicalConfig: LogicalConfig = {
    ...lockFile.logical_config,
    ...(permissionPolicy !== undefined
      ? { permission_policy: permissionPolicy }
      : {})
  };

  // ── Install to selected harnesses ──────────────────────────────────────────
  for (const id of harnesses) {
    const writer =
      harnessWriters.find((w) => w.id === id) ?? getHarnessWriter(id);
    if (writer) {
      await writer.install(logicalConfig, projectRoot);
    }
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  // Stage any new/unchanged inline skills to .ade/skills/ (skips locally modified ones).
  const modifiedSkills = await writeInlineSkills(logicalConfig, projectRoot);
  if (modifiedSkills.length > 0) {
    clack.log.warn(
      `The following skills have been locally modified and will NOT be updated:\n` +
        modifiedSkills.map((s) => `  - ${s}`).join("\n") +
        `\n\nTo use the latest defaults, remove .ade/skills/ and re-run configure.`
    );
  }

  // Always install all skills — no dialog needed.
  if (logicalConfig.skills.length > 0) {
    await installSkills(logicalConfig.skills, projectRoot);
  }

  // ── Knowledge sources ──────────────────────────────────────────────────────
  if (logicalConfig.knowledge_sources.length > 0) {
    const initCommands = logicalConfig.knowledge_sources
      .map((s) => `  npx @codemcp/knowledge init ${s.name}`)
      .join("\n");
    const confirmInit = await clack.confirm({
      message: `Initialize ${logicalConfig.knowledge_sources.length} knowledge source(s) now?`,
      initialValue: false
    });

    if (typeof confirmInit === "symbol") {
      clack.cancel("Configure cancelled.");
      return;
    }

    if (confirmInit) {
      await installKnowledge(logicalConfig.knowledge_sources, projectRoot, {
        force: true
      });
    } else {
      clack.log.info(
        `Knowledge sources configured. Initialize them when ready:\n${initCommands}`
      );
    }
  }

  clack.outro(
    "Configuration applied! Re-run `ade configure` any time to change your autonomy profile."
  );
}
