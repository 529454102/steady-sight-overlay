# 稳视 Overlay

给现有 3D 游戏使用的 macOS / Windows 防晕眩悬浮辅助原型。

当前版本采用透明置顶窗口，不注入游戏进程，优先适配无边框窗口化或窗口化游戏。它提供中心锚点、稳定参照、边缘方向块、水平线、暗角收缩、弱网格、边缘框和转向脉冲等视觉稳定参照。

## 当前功能

- 设置窗口：控制、快捷键、状态摘要和系统路线状态。
- Overlay 窗口：透明、无边框、置顶、默认点击穿透，可覆盖当前显示器。
- 真实预览：设置窗口内可打开/关闭桌面 overlay 预览。
- 可编辑快捷键：在游戏里开关 overlay、临时隐藏、预览、切换点击穿透和配置档。
- 配置档：轻缓、FPS 专注、强辅助、彩色参照、3D 建模。
- 视觉组件：中心锚点、稳定参照、边缘方向块、水平线、暗角、弱网格、边缘框。
- 本地保存：设置会保存到浏览器/Tauri 本地存储。
- 浏览器预览：未安装 Tauri/Rust 时，也可以先打开 `index.html` 看设置界面。

## 本地预览

当前前端没有强依赖框架，可以直接打开：

```text
/Users/jiangyu/Desktop/3d防晕眩/index.html
```

也可以打开 overlay 预览：

```text
/Users/jiangyu/Desktop/3d防晕眩/overlay.html
```

## 桌面开发环境

本项目使用 Tauri 2。首次运行需要安装：

- Node.js 20+
- Rust / Cargo
- macOS: Xcode Command Line Tools
- Windows: Microsoft C++ Build Tools

安装依赖：

```bash
npm install
```

启动桌面开发版：

```bash
npm run tauri:dev
```

构建安装包：

```bash
npm run tauri:build
```

## GitHub Actions 打包

仓库已提供 `.github/workflows/build-installers.yml`，会分别在 GitHub 的 macOS 和 Windows 机器上打包安装文件。

手动构建：

1. 把项目推到 GitHub 仓库。
2. 打开仓库的 `Actions` 页面。
3. 选择 `Build installers`。
4. 点击 `Run workflow`。
5. 构建完成后，在当前运行记录底部下载 `macos-installers` 和 `windows-installers`。

发版本构建：

```bash
git tag v0.1.0
git push origin v0.1.0
```

推送 `v*` 标签后，GitHub Actions 会自动构建 macOS 和 Windows 安装包。

注意：未配置签名证书时，macOS 和 Windows 都会把安装包视为未签名应用。内部测试可以用，公开发布前建议补 Apple Developer ID 签名、公证，以及 Windows 代码签名证书。

## 游戏兼容边界

- 最稳定：无边框窗口化、窗口化模式。
- 可能不可见：独占全屏游戏、部分反作弊保护很强的游戏、部分系统级全屏空间。
- 本原型不读取游戏内存、不注入 DLL、不修改渲染管线，目标是降低兼容和反作弊风险。
- macOS 上若需要跨全屏空间或更强置顶能力，后续可能要增加辅助功能权限提示和平台特定窗口层级处理。

## 快捷键

快捷键可在左侧“快捷键”菜单里录制、清除或恢复默认。下面是初始键位：

- `Cmd/Ctrl + Shift + O`：开关 Overlay。
- `Cmd/Ctrl + Shift + H`：临时隐藏 / 恢复当前 Overlay。
- `Cmd/Ctrl + Shift + P`：打开 / 关闭预览。
- `Cmd/Ctrl + Shift + 1`：切换轻缓模式。
- `Cmd/Ctrl + Shift + 2`：切换 FPS 专注。
- `Cmd/Ctrl + Shift + 3`：切换强辅助。

点击穿透、彩色参照、3D 建模默认不占用全局快捷键，可以按需自行绑定。

## 路线状态

已完成：

1. 全屏尺寸同步：启动或预览 overlay 时铺满当前/主显示器。
2. 真实预览开关：设置窗口可以打开/关闭桌面 overlay 预览。
3. 视觉配置档：支持轻缓、FPS 专注、强辅助、彩色参照、3D 建模。
4. 稳定参照层：支持横竖稳定杆、边缘方向块和边缘箭头。
5. macOS 透明层：已启用 Tauri `macos-private-api` 处理 WKWebView 白底。
6. 可编辑快捷键：通过 `tauri-plugin-global-shortcut` 动态注册用户自定义键位，并显示冲突或系统占用状态。

待完成：

1. 应用配置档：按前台进程名自动加载不同参数。需要 macOS/Windows 进程检测。
2. 动态触发：根据鼠标移动速度或输入强度短时增强暗角。需要系统级输入监听或可选非穿透模式。
3. 多显示器选择：支持指定显示器，而不是只使用当前/主显示器。
4. 托盘常驻和开机启动：用于隐藏主窗口后继续运行 overlay。
5. 打包发布：补齐 macOS `.dmg`、Windows `.msi`、签名和更新流程。
