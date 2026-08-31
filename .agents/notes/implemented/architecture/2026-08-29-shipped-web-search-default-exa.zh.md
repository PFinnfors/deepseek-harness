# Agent Note: 随附 web 搜索默认改为 Exa

Status: implemented

[English](2026-08-29-shipped-web-search-default-exa.md) | 中文

## Problem

base bundle 把随附的 `web_search` 固定为 DeepSeek 原生搜索（`web` 行上 `searchProvider: deepseek-official`，并挂载带 `apiKeyEnv: DEEPSEEK_API_KEY` 的 `web-search-deepseek`）。于是每次模型搜索都耗费一整轮带服务端检索的辅助 Messages 往返——每次查询都有延迟与 token 开销——工具行还不得不把 `searchTimeoutMs` 覆盖为 60s 来容纳该往返。搜索能力还继承了聊天的凭据（`DEEPSEEK_API_KEY`），因此部署要么接受该成本，要么就得做配置改动来换更轻量的搜索后端。web 能力 seam（[2026-06-24-web-capability-seam](2026-06-24-web-capability-seam.zh.md)）本身刻意让提供方可换，所以没有任何契约强迫这个选择；是随附默认这样选。

## Decision

base bundle 现在在每个 dsh profile 上把 `searchProvider` 固定为 `exa` 并挂载 `web-search-exa`。Exa 用单次 HTTP 往返返回带可移植 snippet 与发布日期的结果，因此适用提供方无关的 30s 工具预算，针对 DeepSeek 的 `searchTimeoutMs: 60000` 覆盖被移除——包括随附 `tool-web` 行，以及 Web 应用的 `standard`、`ptc`、`cordis` agent 预设（它们为 DeepSeek 往返携带了同样的调优）。`web-search-exa` 从启动环境中的 `$EXA_API_KEY` 解析密钥；想要其他后端的部署只需像任何其他搜索后端覆盖该 seam 那样，替换 `searchProvider` 并挂载对应提供方。

DeepSeek 搜索仍作为随附提供方存在，只是不再是默认。`dsh` 应用（`apps/cli`）在依赖闭包中保留 `@deepseek-ai/dsh-web-search-deepseek`，以便显式挂载的行仍可解析；web e2e DeepSeek 搜索场景通过 scaffold 把 `web` 重新固定为 `searchProvider: deepseek-official`，让真实提供方调用确定性的本地 Messages 替身——从而保住随附 DeepSeek 路径对模型可见与持久化行为的覆盖。

## Alternatives considered

- **保留 DeepSeek 原生搜索作为随附默认**：否决——它让每个默认部署的每次搜索都强制一轮模型往返、一个会话事件词汇里的辅助请求，以及 60s 工具预算，相比单请求后端既无提供方无关 schema、模型可见或持久化上的收益。
- **不固定而是自动选择（`searchProvider: exa`）**：否决——固定符合 seam 的显式解析规则；自动选择只在恰好一个可用提供方注册时生效，一旦部署挂载第二个后端，默认就会因 `WEB_PROVIDER_AMBIGUOUS` 失败，且没有文档化的首选。
- **把 DeepSeek 提供方从随附面整个删除**：超出默认变更——它是有自己 settings 卡片和完整路径 e2e 的真产品能力；本次改动是默认值，不是删除。

## Consequences

- 每个随附 profile 用一次 HTTP 调用、而非一个模型轮次回答 `web_search`，工具回退到提供方无关的 30s 预算。
- 搜索能力从聊天凭据解耦：`$EXA_API_KEY` 是自己的启动环境密钥，模型提供方与搜索后端可以不同。
- `dsh` 应用依赖闭包新增 `@deepseek-ai/dsh-web-search-deepseek`（此前经 `dsh-base` 才可达），保持 DeepSeek 提供方对显式挂载与 web e2e DeepSeek 场景可解析。
- 随附 `web-search-deepseek` settings 卡片仍是 DeepSeek 提供方的配置面；除非部署挂载该提供方，否则它保持惰性。
