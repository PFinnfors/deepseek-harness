# Agent Note: 随附 dsh CLI 的 LSP 代码导航

Status: implemented

[English](2026-08-29-shipped-lsp-code-navigation.md) | 中文

## Problem

LSP 能力 seam（[2026-07-15-lsp-capability-seam](2026-07-15-lsp-capability-seam.zh.md)）以三个包随附上线——`dsh-lsp`、`dsh-lsp-stdio`、`dsh-tool-lsp`——但 `dsh` 应用的依赖闭包并未包含它们。通过 `cordis.yml` 覆盖挂载该 seam 的部署无法解析这些具名插件，因此尽管 seam、通用 stdio host 与模型面向工具都已存在，随附 CLI 仍不能使用语义代码导航。

## Decision

`dsh` 应用（`apps/cli`）在依赖中新增 `@deepseek-ai/dsh-lsp`、`@deepseek-ai/dsh-lsp-stdio`、`@deepseek-ai/dsh-tool-lsp`，使该随附 seam 可被 CLI 解析。`apps/cli/config/examples/lsp/` 下随附两个默认关闭的示例覆盖，各自作为独立插件实例挂载该 seam：

- `lsp-python.cordis.yml` 挂载三个包并配一个 server（`python`，命令 `pyright-langserver`，`args: ['--stdio']`，`.py` → `python`）。
- `lsp-gdscript.cordis.yml` 挂载三个包并配一个 server（`gdscript`，命令 `godot`，`args: ['--lsp']`，`.gd` → `gdscript`），面向 Godot 4.4+/4.6-dev 中新增的 Godot 原生 stdio 语言服务器。

Python 与 GDScript server 是需要部署自行安装到 PATH 的前置条件；这台机器装有 `pyright`，但没有带 `--lsp` 的 `godot` 二进制。`dsh-lsp-stdio` 在注册任何 provider 前于加载时解析每个配置的 server 可执行文件，因此缺失可执行文件会让该覆盖的插件实例什么都不注册并响亮失败。由于每个覆盖都是独立的 `dsh-lsp-stdio` 实例，缺失 `pyright` 或 `godot` 不会阻挡另一覆盖。激活是选择加入的（`dsh web --patch apps/cli/config/examples/lsp/lsp-*.cordis.yml`）。

## Alternatives considered

- **把 Python 与 GDScript server 放在单个 `dsh-lsp-stdio` 实例里的合并覆盖**：否决——该 host 于加载时解析每个配置的可执行文件，缺失 `godot` 或 `pyright` 的机器会让整个实例失败，从而破坏已安装的那个语言。
- **自动检测已安装 server**：否决——通用 host 明确不是语言服务器目录或安装器；部署有意自行配置命令与映射，静默降级与针对缺失配置 server 的响亮失败规则相悖。
- **接线进随附 base-bundle profile**：否决——LSP 是可选能力；默认加到每个 profile 就需要随附一个 server，且违背该 seam 记录的选择加入式覆盖模式。

## Consequences

- `dsh` 应用依赖闭包新增三个包，显式挂载该 seam 的覆盖可通过随附的 `cordis-plugin-loader` 解析。
- 每种语言以独立覆盖随附，部署上缺失某 server 只会让该语言失败；另一覆盖独立激活。
- 当部署选择加入并安装 server 时，agent 可获得语义导航（`goToDefinition`、`findReferences`、`goToImplementation`、`hover`）；未安装 server 时覆盖响亮失败，而非静默返回空结果。
- Godot 原生 `--lsp` stdio 模式属实验性且不把 print 输出重定向到 stderr，因此 server 日志可能混杂在 stdout；更严格的客户端可能拒绝，覆盖文档把 stdio 到 TCP 桥（`godot-lsp-stdio-bridge`）记录为已报告的兜底方案。
