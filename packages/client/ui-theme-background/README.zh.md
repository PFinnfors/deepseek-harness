---
description: "自定义主题与背景设置页：None/Tokyo Night 令牌覆盖、聊天区背景图与品牌标题覆盖；供挂载名单行的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-theme-background

[English](README.md) | 中文

## 概述

本包向设置页贡献一个「主题」页面，包含三个相互独立的控件：品牌标题输入框（非空时覆盖侧栏的「DSH Local Build」文本）、主题选择器（None / Tokyo Night，将 tokyonight 令牌层按浅色与深色两种模式叠加到随附主题之上）、以及背景图（以低透明度铺满聊天区、位于会话文本之下）。三项选择都保存在 `localStorage` 中，因此可在页面刷新与插件重新运行后继续保留。本包只贡献浏览器呈现，不向模型请求添加任何内容。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在部署的浏览器名单中挂载本插件（一行 `dsh.client`），设置外壳即会渲染「主题」页面。该页面作为独立的导航项注册在随附设置页旁边；背景与标题效果作用于外壳所声明的那两个接缝（聊天区与侧栏）。

### 选择主题

None 让随附的浅色/深色/跟随系统行为与插件不存在时完全一致。Tokyo Night 叠加单个令牌覆盖层（全部 13 个 DSH 别名令牌映射到 folke tokyonight `night` 调色板，且浅色与深色取值相同），因此无论外观偏好如何它都生效。

### 设置背景

「设置背景 / 更新背景」选择图片文件，并以缩放后的 WebP data URL 存入 `localStorage`；「清除背景」将其移除。图像绘制在聊天滚动接缝（`[data-conversation-scroll]`）上，以 `cover` 缩放并叠加主题感知的底色——绝不进入侧栏，也与主题选择器保持独立。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

浏览器半部创建了一个瞬态可观察源（`createThemeSettingsSource`），两个槽位填充共享它并向 `localStorage` 持久化。apply 侧的效果订阅该源：令牌覆盖（`ctx.theme.overrideTokens`）、聊天背景样式表（带 `data-plugin` 属性的包私有 `<style>` 标签）、以及条件性的 `sidebar.brand.name` 填充——仅在标题非空时注册，因此空标题时随附回退保持原样。设置页以跟随语言环境的导航标签注册进 `settings.section`；node 半部是一个空 Loader 座位。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当主题或布局表面不够用时阅读以下页面。它们从本包占据的槽位进入渲染这些槽位的外壳。

- [ui-settings](../ui-settings/README.zh.md)——声明 `settings.section` 并渲染设置面板。
- [ui-sidebar](../ui-sidebar/README.zh.md)——声明 `sidebar.brand.name` 并渲染其回退。
- [ui-theme](../ui-theme/README.zh.md)——持有本包叠加所覆盖的 `--dsw-*` 令牌注册表。
- [ui-conversation](../ui-conversation/README.zh.md)——持有背景所绘制的 `data-conversation-scroll` 聊天滚动视口。
- [Web 客户端架构](../../../.agents/notes/implemented/architecture/2026-07-19-gui-web-client-architecture.zh.md)——浏览器插件行如何加载并注册槽位。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包只贡献浏览器呈现；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制界定了该页面的控件供给方式。它们是当前包约束，不是功能积压。

- **主题列表固定**——只有 None 与 Tokyo Night 两个选择；增改或管理主题刻意不在范围内。
- **持久化按浏览器生效**——选择保存在本浏览器的 `localStorage`，而非部署设置文档。
- **标题只覆盖侧栏品牌**——浏览器文档标题是构建环境的事（`DSH_CLIENT_TITLE`），不在槽位系统之内。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>