# 人物头像底色规范

所有 card-lab 页面沿用原先 10U 战神头像的浅紫底色 #EEE3FB，包括抽卡大图、最近收藏、卡册、详情、阵容、战场和排行榜。未拥有角色保留灰度状态。人物服装、头发和道具颜色保持原有设计。

## 资源

使用内置 image_gen 编辑原插画，六张原本带有不透明背景的头像改用以下浅紫底版本。原图保留；其余十二个人物复用透明图片，通过统一 CSS 底色显示。

- `public/strategy-icons/showoff-lavender.png`
- `public/strategy-icons/contrarian-lavender.png`
- `public/strategy-icons/cz-brother-v2-lavender.png`
- `public/strategy-icons/first-lady-lavender.png`
- `public/strategy-icons/kzg-mask-bro-concept-lavender.png`
- `public/strategy-icons/liang-xi-lavender.png`

## 最终编辑提示词

Edit the attached avatar image. Change ONLY its pure white background to a uniform, flat, very pale lavender color RGB(238,227,251), hex #EEE3FB. This is a solid opaque light lavender backdrop, no transparency, no checkerboards, no white background, no gradient, no circle, no pattern. Preserve the existing character's exact identity, expression, pose, hair, clothing, foreground props, illustration style, scale and framing. Preserve foreground whites including eyes and medical mask. Do not redesign the character. Square image, edge-to-edge light lavender background behind the character.

## 接入

public/card-lab-data.js 统一图片映射；public/card-lab.js 的 imageTag 统一 character-avatar 类；public/card-lab-brand.css 使用 --avatar-surface 统一底色。纯白版本已停用。
