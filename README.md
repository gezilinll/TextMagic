# TextMagic

`TextMagic` is the next generation text component. Unlike native input and textarea components, it supports richer text effects and typesetting capabilities. By controlling text layout autonomously, it ensures consistent text display across different platforms and browsers. TextMagic follows a modular design approach, offering both an integrated component(`@text-magic`) for seamless integration and standalone components for specific needs: `@text-magic/input` for text input and `@text-magic/renderer` for text typesetting and rendering.

## Try it

[TextMagic - A Next Generation of Text Input](https://text-magic.gezilinll.com) requires an initial download of approximately 10MB of resources. Depending on server network speed, this may take 10-20 seconds.

![Text-Mgaic](text-magic.gif)

## How to use

We are currently intensively preparing and expect to be ready for official use in projects within a month.

## Framework

![text-magic-framework](https://p.ipic.vip/fd6vlm.jpg)

## Data Structure & API

In the design of the data structure, we currently refer to CSS standards as much as possible, making additions or deletions as needed. The interface design of `TMInput` and `TMRenderer` is relatively simple, primarily focusing on the `measure` and `render` interfaces. Other aspects, such as common APIs for font registration, cursor display, selection display, and the insertion of text and rich text styles, are encapsulated within the components, so users do not need to focus on these details. The most critical elements are `TMTextData` and `TMTextMetrics`, as these determine what data should be communicated between components and the rules for this communication.

This section will introduce the core APIs and data fields. For more detailed information, please refer to `text-data.d.ts`, `text-input.d.ts`, `text-renderer.d.ts`, and the interface comments and corresponding code logic.

![text-magic-uml-en](https://p.ipic.vip/0p4b1e.jpg)

## Performance

Systematic testing (include unit tests and automated tests) has not yet been conducted, but based on subjective feedback from myself and a few colleagues, there is no significant performance difference compared to native input and textarea components. We expect to complete this testing within a month.

## Features

#### Text Typesetting

- [x] Font
- [x] Font size
- [x] Text color
- [x] Line height
- [x] Letter spacing
- [x] Line spacing
- [ ] First-line indent
- [x] Horizontal alignment
  - [x] Left align
  - [x] Center align
  - [x] Right align
  - [ ] Justify
- [ ] Vertical alignment
- [x] List text
  - [x] Unordered list - solid circle
  - [x] Unordered list - hollow circle
  - [ ] Ordered list - Arabic numerals
  - [x] Emoji
  - [ ] Mixed typesetting
- [x] Line break
- [ ] Vertical writing
- [x] Writing direction
  - [x] Left to right
  - [ ] Right to left
  - [ ] Top to bottom
  - [ ] Bottom to top

#### Text Effects

- [x] Bold
- [x] Italic
- [x] Decorative lines
  - [x] Underline - solid line
  - [x] Underline - wavy line
  - [x] Strikethrough - solid line
  - [x] Strikethrough - wavy line
- [x] Outline
- [x] Shadow
- [x] Blur
- [ ] Background
- [x] Highlight
  - [x] Background color
  - [x] Circle highlight
  - [x] Check mark
- [ ] Text box background

#### Shortcuts

- [x] Ctrl/CMD + A Select all
- [x] Ctrl/CMD + C Copy
- [ ] Ctrl/CMD + X Cut
- [x] Ctrl/CMD + V Paste
- [ ] Ctrl/CMD + Z Undo
- [ ] Ctrl/CMD + Y Redo
- [ ] Ctrl/CMD + Left Arrow Move to beginning of line
- [ ] Ctrl/CMD + Right Arrow Move to end of line
- [x] Shift + Left Arrow Select previous character
- [x] Shift + Right Arrow Select next character
- [x] Shift + Up Arrow Select line above
- [x] Shift + Down Arrow Select line below
- [x] Up Arrow Move up
- [x] Down Arrow Move down
- [x] Left Arrow Move left
- [x] Right Arrow Move right
- [ ] Home Move to beginning of text box
- [ ] End Move to end of text box

#### User Interaction

- [x] Text box resizing
- [ ] Width and height adaptation
- [ ] Fixed width
- [ ] Fixed height
- [ ] Display overflow text box content
