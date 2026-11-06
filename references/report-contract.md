# 网站设计规范输出

默认主交付为可浏览的 `index.html`；制作与验收按 [页面交付规范](page-contract.md)。以下 Markdown/JSON 保留研究细节和证据，页面不能只把这些文字原样贴成一篇长文章。

## 任务文件归档

每次分析的根目录按 SKILL.md 的命名与续作规则确定。所有由本任务生成、可指定保存位置的文件集中到这里；读取 Skill 源文件或复用已有素材不要求搬动原件。

```text
studio_DESIGN_202611061349/
├── study.json          # 初始化信息，用于识别同一次任务
├── index.html          # 展示页
├── DESIGN.md           # 原站的可复用设计规则
├── design-spec.md      # 完整研究报告
├── page-data.json      # 页面生成数据
├── evidence.json       # 采集证据
├── design-tokens.json  # 有实测 Token 时才生成
├── assets/             # 展示页依赖的样式、脚本与素材
├── screenshots/        # 必要的原站截图
└── work/               # 临时脚本、中间数据、日志、验收截图
```

按实际需要创建文件和子目录，不生成空报告或占位附件。宿主工具支持输出路径或工作目录时显式指向任务目录；工具固定保存到临时目录或下载目录时，将本任务生成的文件归档进来并更新引用，不删除用户原有文件。浏览器自身缓存、工具运行环境和已安装依赖不属于任务交付文件。

最终页面和附件使用任务目录内的相对路径；复用的外部本地素材复制到 `assets/`，保持整个目录可移动。预览直接服务此目录，不另造一份页面到其他目录。结束前核对页面依赖、证据路径和工作文件均已归档，向用户提供展示页链接及任务目录路径。失败或中断也保留在原任务目录，续作不另起一套。

## 证据等级

统一使用 `measured`（DOM/computed/文件实际读数）、`observed`（真实截图或交互序列）、`inferred`（视觉估计/规律推测）、`untested`（未能观察）。`declared` 可标 CSS 规则存在，但不能代表状态已触发。每个关键结论附证据编号；未知值用 null，禁止用 0 代替未知。

观察器的样本包含有布局几何的屏外元素。子元素自身 opacity=1 仍可能被父元素 opacity=0 隐藏；computed值不能证明已在截图中可见，逐屏分析必须结合祖先状态与真实截图。

## DESIGN.md（可用于设计改版）

每次交付输出一份被分析网站的可复用视觉规范：风格原则、角色配色、字体与字级、布局和间距、边框/圆角/阴影、组件与已知状态、动效、响应式、使用约束。给出可执行参数及用途，说明采样范围和未知项；建议值与实测值分别标记。仅根据指定页面有证据的内容写规则，不将一次局部测量称为全站规范。

开头声明文件描述的是被分析网站，而非 CatchWeb-Design 文档框架。可供开发 Agent 结合目标项目进行视觉改版；未覆盖的业务流程、组件状态和移动端需另外设计或验证。`design-spec.md` 是完整研究报告，`DESIGN.md` 是精炼的实现约束，二者复用相同事实。文档框架的设计规范见 [document-style.md](document-style.md)。

## design-spec.md

1. **采样说明**：指定 URL、日期、视口、能力限制、覆盖表（桌面/移动/已观察状态/未覆盖原因）。
2. **风格与复用原则**：媒介、气质、信息密度、视觉重心、网格节奏；每项举实图证据。
3. **色板**：角色、颜色值/透明度、背景依赖、用途、出现页与来源。渐变完整方向和色标另列，不将混合背景采样色认定为原始 CSS 色值。
4. **字体体系**：角色或语义级别、声明字体栈、可知的加载状态、桌面与移动字号、字重、line-height、letter-spacing、text-transform、最大行长、证据。
5. **布局与表面**：容器、列宽/沟槽、栅格变化、对齐线、边距/间距阶梯、边框/分割线、四角圆角、阴影与透明表面；区分归纳 Token 与单次特例。
6. **组件与状态矩阵**：组件变体 × 默认/hover/focus/active/selected/disabled/loading/error/success。每格记录真实差异和证据等级，未出现的状态明确未测试。
7. **动效矩阵**：页面/对象/触发/起止属性/时长/延迟/缓动/滚动区间或阈值/是否重复/设备差异/证据。JS 动效参数不可读时写观察效果和估计范围。
8. **页面模块地图**：模块顺序、相对高度/坐标、布局、文案角色、图片比例、下一段衔接方式；“第几屏”必须附实际视口，响应式换行不当作新页面。
9. **可复用关系**：指定页面内部的导航、栅格、交互、背景与留白节奏；只有用户明确要求多个页面时才写跨页关系。
10. **未验证项**：明确指定页面缺哪些状态和行为，如何补测。不要用建议值填充站点事实。

## evidence.json

```json
{
  "schemaVersion": "catchart.website-evidence.v1",
  "scope": {"entryUrl": "https://example.com", "sampledPages": [], "unvisitedPages": []},
  "observations": [
    {"id": "E1", "url": "https://example.com", "viewport": {"width": 1440, "height": 900}, "scrollY": 0, "target": "header primary button", "state": "default", "basis": "measured", "property": "border-radius", "value": "8px", "screenshot": "screenshots/home-desktop.png"}
  ]
}
```

示例域名和数值只说明结构，不能写入真实采样结果。证据文件保留必要样式与位置，省略用户输入、Cookie、隐藏字段和个人资料。

## design-tokens.json

采用简单可读的分组：`color`、`typography`、`space`、`radius`、`border`、`shadow`、`motion`。每项包括 `value`、`basis`、`evidenceIds`；未验证项不生成值。需要 DTCG、CSS 变量或代码导出时再按用户指定格式转换，不默认声称符合外部标准。
