<!-- README.md -->

# _now_

This project is heavily inspired by
[Frame](https://github.com/lelanthran/frame/tree/master), and implements a
similar behavior using a CLI and data stored in a markdown file for greater
accessibility.


## What is this?

`now` is a minimal, opinionated, terminal-based tool for reminding you what to focus on.

![now](https://github.com/user-attachments/assets/9e6944f0-996a-4314-83d1-f0e8f52880ea)

`now` treats all work as a tree, where higher items are broader, and lower items are more specific.

```
- Accomplish quarterly goals
  - Learn rust
    - Take a course for beginners
      - Open rust-lang.org/learn @
  - Document the spacing scale in the design system
    - Review examples of good documentation
      - Check out storybook's projects showcase
      - Search briefly for other resources
```

`now` will highlight the immediate item you're focused on, `▶︎ Open rust-lang.org/learn`, and display that item's ancestors as a breadcrumb trail `Accomplish quarterly goals / Learn rust / Take a course for beginners`, providing just enough context for what could be a very specific task.

## Installation

```
curl -fsSL https://raw.githubusercontent.com/shanberg/now/main/dist/install.sh | sh
```

## Using `now`

- After installing, start `now` in your terminal with `now tui`. Open it again in the same directory to access the same set of tasks.
- Start with broad tasks. If you're making progress, continue. If at any point your work becomes unclear or too broad, narrow your focus to something more specific and actionable. When you're done with something, `now` _deletes it_ and moves your focus to the next actionable item.
- `now` respects [yak-shaving](https://en.wiktionary.org/wiki/yak_shaving#/media/File:Yak_shaving.jpg) by not asking you to think about subtasks, headings, or working contexts. There is only a simple, ephemeral tree.
- Try using `now` in VSCode with the `*.now.md` file for an overview of available work.

  ![Now in VSCode](https://github.com/user-attachments/assets/fdc0464f-abb0-45ff-abda-becaa26bf948)

## License

This project is licensed under the Apache License, Version 2.0, January 2004.
