# Agent Note: Web 主题与背景设置页

Status: implemented

[English](2026-08-29-shipped-web-theme-background-settings.md) | 中文

## 问题

随附 Web 应用只把主题选择暴露为偏好行（`ui-theme` 的外观条目），标题也来自构建期配置；用户无法在界面中更换浏览器表面主题、设置聊天背景或覆盖侧边栏品牌名。`ui-theme` 运行时已带有文档化的 `overrideTokens` 分层接口（动态插件须把来源钉到包身份），但没有随附消费者，设置壳的 `settings.section` 席位也没有主题页。

## 决策

新增客户端插件 `@deepseek-ai/dsh-client-ui-theme-background`，随 web-app 包发布（`dsh.client` 名册行），占用设置壳的 `settings.section` 席位作为主题页（`id: 'theme'`，排在 General 与 Models 之间）。页面绑定一个瞬态可观察源（`createThemeSettingsSource`），它持久化到 `localStorage`；三个副作用订阅该源：

- 选中 Tokyo Night 时调用 `ctx.theme.overrideTokens('theme-background-settings', TOKYO_NIGHT)`——一层明暗值相同的令牌覆盖，压过随附的别名令牌；
- 包自有的样式表在主题感知底色上，把所选背景（降采样 WebP data URL）铺到中栏聊天滚动区（`[data-conversation-scroll]`）；
- 仅在标题非空时注册 `sidebar.brand.name` 占位，替换随附的回退文案。

该插件只提供浏览器表现：节点半侧是空的 Loader 席位，不会进入模型请求。fork 的 `ui-theme` 已提供 `overrideTokens`（上游 `4064198560`），因此无需改动主题运行时。

## 备选方案

- **扩展现有 `ui-theme` 而非新包**：否决——主题运行时负责注册表与受保护的覆盖接口；设置页与背景层属于表现，会把文案、样式和设置占位拖进运行时包。
- **用设置框架持久化而非 `localStorage`**：否决——源还需驱动渲染树之外的副作用，而框架持有的 store 实例在树外不可达；带防护 `localStorage` 回写的根级可观察源是能跨刷新与重跑存活的最小形态。

## 影响

- 随附 Web 应用新增主题设置页（无 / Tokyo Night）、聊天背景控件与自定义侧边栏品牌标题，均按浏览器持久化。
- `web-app` 包补丁、包清单、客户端 tsconfig 聚合与席位目录各加一行；`docs/config-catalog.*` 已重新生成；设置对话框黄金文件补上主题导航行。
- 该包带有与参照原版相同的四条 `oxlint` 提示（源码逐字节一致），与上游一致，不在本次范围内。